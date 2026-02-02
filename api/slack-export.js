import { WebClient } from '@slack/web-api';

// Initialize Slack client
const slack = new WebClient(process.env.SLACK_BOT_TOKEN);

// Maximum file size to embed (5MB)
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

// File types to embed as base64
const EMBEDDABLE_MIMETYPES = [
  'image/jpeg',
  'image/png', 
  'image/gif',
  'image/webp',
  'image/svg+xml'
];

/**
 * Download a file from Slack and convert to base64
 * @param {string} url - The url_private of the file
 * @param {string} token - Slack bot token for authentication
 * @returns {Promise<string|null>} Base64 encoded file data or null if failed
 */
async function downloadFileAsBase64(url, token) {
  try {
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      console.warn(`Failed to download file: ${response.status} ${response.statusText}`);
      return null;
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    return buffer.toString('base64');
  } catch (error) {
    console.warn(`Error downloading file from ${url}:`, error.message);
    return null;
  }
}

/**
 * Process files in a message and embed downloadable ones
 * @param {Array} files - Array of file objects from a message
 * @param {string} token - Slack bot token
 * @returns {Promise<Array>} Files array with embedded data where possible
 */
async function processMessageFiles(files, token) {
  if (!files || files.length === 0) return files;
  
  const processedFiles = await Promise.all(files.map(async (file) => {
    // Check if file should be embedded
    const shouldEmbed = 
      file.url_private &&
      file.size <= MAX_FILE_SIZE_BYTES &&
      EMBEDDABLE_MIMETYPES.includes(file.mimetype);
    
    if (shouldEmbed) {
      console.log(`Downloading file: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`);
      const base64Data = await downloadFileAsBase64(file.url_private, token);
      
      if (base64Data) {
        return {
          ...file,
          file_data: base64Data,
          file_data_mimetype: file.mimetype
        };
      }
    }
    
    return file;
  }));
  
  return processedFiles;
}

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verify admin authentication
    const { passkey } = req.body;
    if (!passkey) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Secure hash function using Node.js built-in crypto (same as used in auth.js)
    const crypto = require('crypto');
    const secureHash = (str) => {
      return crypto.createHash('sha256').update(str).digest('hex');
    };

    const inputHash = secureHash(passkey);
    const adminPasskeyHash = process.env.ADMIN_PASSKEY_HASH;

    if (inputHash !== adminPasskeyHash) {
      return res.status(401).json({ error: 'Admin access required' });
    }

    // Check if Slack token is configured
    if (!process.env.SLACK_BOT_TOKEN) {
      return res.status(500).json({ 
        error: 'Slack bot token not configured. Please set SLACK_BOT_TOKEN environment variable.' 
      });
    }

    console.log('Starting automated Slack export...');

    // Fetch workspace info
    const authTest = await slack.auth.test();
    console.log(`Connected to workspace: ${authTest.team}`);

    // Fetch all channels
    const channelsResponse = await slack.conversations.list({
      types: 'public_channel,private_channel',
      limit: 1000
    });

    const channels = channelsResponse.channels || [];
    console.log(`Found ${channels.length} channels`);

    // Fetch users
    const usersResponse = await slack.users.list({
      limit: 1000
    });

    const users = usersResponse.members || [];
    console.log(`Found ${users.length} users`);

    // Create users lookup
    const usersById = {};
    users.forEach(user => {
      usersById[user.id] = user;
    });

    // Fetch messages for each channel
    const channelMessages = {};
    const channelData = {};

    for (const channel of channels) {
      try {
        console.log(`Fetching messages for channel: ${channel.name}`);
        
        // Get channel history (last 30 days by default)
        const thirtyDaysAgo = Math.floor((Date.now() - (30 * 24 * 60 * 60 * 1000)) / 1000);
        
        const historyResponse = await slack.conversations.history({
          channel: channel.id,
          oldest: thirtyDaysAgo.toString(),
          limit: 1000
        });

        const messages = historyResponse.messages || [];
        console.log(`Found ${messages.length} messages in ${channel.name}`);

        // Transform messages to match the expected format and download files
        const transformedMessages = await Promise.all(messages.map(async (message) => {
          // Process files if present
          const processedFiles = message.files 
            ? await processMessageFiles(message.files, process.env.SLACK_BOT_TOKEN)
            : undefined;
          
          return {
            ...message,
            files: processedFiles,
            user_profile: usersById[message.user] ? {
              display_name: usersById[message.user].profile?.display_name || usersById[message.user].real_name || usersById[message.user].name,
              real_name: usersById[message.user].real_name || usersById[message.user].name,
              image_72: usersById[message.user].profile?.image_72
            } : null
          };
        }));

        channelMessages[channel.name] = transformedMessages;
        channelData[channel.name] = {
          id: channel.id,
          name: channel.name,
          created: channel.created,
          creator: channel.creator,
          is_archived: channel.is_archived,
          is_general: channel.is_general,
          members: channel.num_members || 0,
          purpose: channel.purpose?.value || '',
          topic: channel.topic?.value || ''
        };

        // Add a small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (channelError) {
        console.error(`Error fetching messages for channel ${channel.name}:`, channelError);
        // Continue with other channels even if one fails
        channelMessages[channel.name] = [];
        channelData[channel.name] = {
          id: channel.id,
          name: channel.name,
          created: channel.created,
          creator: channel.creator,
          is_archived: channel.is_archived,
          is_general: channel.is_general,
          members: channel.num_members || 0,
          purpose: channel.purpose?.value || '',
          topic: channel.topic?.value || ''
        };
      }
    }

    // Create the export data structure
    const exportData = {
      channels: channelData,
      messages: channelMessages,
      users: usersById,
      exportDate: new Date().toISOString(),
      totalChannels: channels.length,
      totalUsers: users.length,
      totalMessages: Object.values(channelMessages).reduce((sum, msgs) => sum + msgs.length, 0)
    };

    console.log(`Export completed: ${exportData.totalChannels} channels, ${exportData.totalUsers} users, ${exportData.totalMessages} messages`);

    return res.status(200).json({
      success: true,
      data: exportData,
      message: `Successfully exported ${exportData.totalChannels} channels with ${exportData.totalMessages} messages`
    });

  } catch (error) {
    console.error('Slack export error:', error);
    
    // Handle specific Slack API errors
    if (error.code === 'not_authed') {
      return res.status(401).json({ 
        error: 'Slack authentication failed. Please check your bot token.' 
      });
    } else if (error.code === 'missing_scope') {
      return res.status(403).json({ 
        error: 'Insufficient Slack permissions. Bot needs channels:read, channels:history, users:read scopes.' 
      });
    } else if (error.code === 'rate_limited') {
      return res.status(429).json({ 
        error: 'Rate limited by Slack API. Please try again later.' 
      });
    }

    return res.status(500).json({ 
      error: 'Failed to export Slack data',
      details: error.message 
    });
  }
}
