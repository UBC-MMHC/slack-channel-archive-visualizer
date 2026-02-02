// TypeScript interfaces for Slack export data

export interface SlackUser {
  id: string;
  team_id: string;
  name: string;
  deleted: boolean;
  color?: string;
  real_name: string;
  tz?: string;
  tz_label?: string;
  tz_offset?: number;
  profile: {
    title?: string;
    phone?: string;
    skype?: string;
    real_name: string;
    real_name_normalized: string;
    display_name: string;
    display_name_normalized: string;
    fields?: Record<string, any>;
    status_text?: string;
    status_emoji?: string;
    status_emoji_display_info?: any[];
    status_expiration?: number;
    avatar_hash: string;
    email: string;
    first_name: string;
    last_name: string;
    image_24: string;
    image_32: string;
    image_48: string;
    image_72: string;
    image_192: string;
    image_512: string;
    image_1024?: string;
    image_original?: string;
    is_custom_image?: boolean;
    status_text_canonical?: string;
    team: string;
  };
  is_admin: boolean;
  is_owner: boolean;
  is_primary_owner: boolean;
  is_restricted: boolean;
  is_ultra_restricted: boolean;
  is_bot: boolean;
  is_app_user: boolean;
  updated: number;
  is_email_confirmed?: boolean;
  who_can_share_contact_card?: string;
}

export interface SlackChannel {
  id: string;
  name: string;
  created: number;
  creator: string;
  is_archived: boolean;
  is_general: boolean;
  members: string[];
  pins?: Array<{
    id: string;
    type: string;
    created: number;
    user: string;
    owner: string;
  }>;
  topic: {
    value: string;
    creator: string;
    last_set: number;
  };
  purpose: {
    value: string;
    creator: string;
    last_set: number;
  };
}

export interface SlackReaction {
  name: string;
  users: string[];
  count: number;
}

export interface SlackRichTextElement {
  type: 'text' | 'link' | 'broadcast' | 'user' | 'channel' | 'emoji';
  text?: string;
  url?: string;
  range?: string;
  user_id?: string;
  channel_id?: string;
  name?: string;
}

export interface SlackRichTextSection {
  type: 'rich_text_section';
  elements: SlackRichTextElement[];
}

export interface SlackRichTextBlock {
  type: 'rich_text';
  block_id: string;
  elements: SlackRichTextSection[];
}

export interface SlackMessage {
  user?: string;
  type: 'message';
  subtype?: 'channel_join' | 'channel_leave' | 'channel_name' | 'channel_topic' | 'channel_purpose' | 'bot_message';
  ts: string;
  text: string;
  edited?: {
    user: string;
    ts: string;
  };
  client_msg_id?: string;
  team?: string;
  user_team?: string;
  source_team?: string;
  user_profile?: {
    avatar_hash: string;
    image_72: string;
    first_name: string;
    real_name: string;
    display_name: string;
    team: string;
    name: string;
    is_restricted: boolean;
    is_ultra_restricted: boolean;
  };
  blocks?: SlackRichTextBlock[];
  reactions?: SlackReaction[];
  thread_ts?: string;
  reply_count?: number;
  replies?: Array<{
    user: string;
    ts: string;
  }>;
  files?: Array<{
    id: string;
    created: number;
    timestamp: number;
    name: string;
    title: string;
    mimetype: string;
    filetype: string;
    pretty_type: string;
    user: string;
    size: number;
    url_private: string;
    url_private_download: string;
    permalink: string;
    permalink_public: string;
    // Embedded file data (base64 encoded) - added during export to preserve files
    file_data?: string;
    file_data_mimetype?: string;
  }>;
  // For system messages
  old_name?: string;
  name?: string;
  topic?: string;
  purpose?: string;
}

export interface SlackExport {
  channels: SlackChannel[];
  users: SlackUser[];
  messages: Record<string, SlackMessage[]>; // channelId -> messages by date
}

export interface ChannelData {
  channel: SlackChannel;
  messages: SlackMessage[];
  users: SlackUser[];
}
