import React from 'react';
import { SlackMessage as SlackMessageType, SlackUser } from '../types/slack';
import { SlackParser } from '../utils/slackParser';
import './SlackMessage.css';

interface SlackMessageProps {
  message: SlackMessageType & { thread_replies?: SlackMessageType[] };
  users: SlackUser[];
  showAvatar?: boolean;
}

const SlackMessage: React.FC<SlackMessageProps> = ({ 
  message, 
  users, 
  showAvatar = true 
}) => {
  const user = message.user ? SlackParser.getUserById(users, message.user) : null;
  const time = showAvatar ? SlackParser.formatDateTime(message.ts) : SlackParser.formatTime(message.ts);
  const messageElements = SlackParser.parseMessageTextToElements(message, users);

  // Handle system messages
  if (message.subtype) {
    const systemMessageClass = `slack-message system-message ${message.subtype ? message.subtype.replace('_', '-') : ''}`;
    return (
      <div className={systemMessageClass}>
        <div className="system-message-content">
          <span className="system-message-text">{message.text}</span>
          <span className="message-time">{time}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="slack-message">
      <div className="message-content">
        {showAvatar && (
          <div className="message-avatar">
            {user?.profile?.image_48 ? (
              <img 
                src={user.profile.image_48} 
                alt={user.real_name}
                className="avatar-image"
              />
            ) : (
              <div 
                className={`avatar-placeholder ${user?.color ? 'colored' : ''}`}
                style={user?.color ? { backgroundColor: `#${user.color}` } : {}}
              >
                {user?.real_name?.charAt(0) || '?'}
              </div>
            )}
          </div>
        )}
        <div className="message-body">
          <div className="message-header">
            <span className="message-author">
              {user?.real_name || user?.name || 'Unknown User'}
            </span>
            <span className="message-time">{time}</span>
            {message.edited && (
              <span className="message-edited">(edited)</span>
            )}
          </div>
          <div className="message-text">
            {messageElements.map((element, elementIndex) => {
              if (typeof element === 'string') {
                return element.split('\n').map((line, lineIndex) => (
                  <React.Fragment key={`${elementIndex}-${lineIndex}`}>
                    {line}
                    {lineIndex < element.split('\n').length - 1 && <br />}
                  </React.Fragment>
                ));
              } else if (element.type === 'link') {
                return (
                  <a 
                    key={elementIndex} 
                    href={element.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="message-link"
                    style={{ 
                      pointerEvents: 'auto', 
                      position: 'relative', 
                      zIndex: 10,
                      display: 'inline'
                    }}
                  >
                    {element.text}
                  </a>
                );
              } else if (element.type === 'user_mention') {
                return (
                  <span 
                    key={elementIndex} 
                    className="user-mention"
                    title={`User ID: ${element.userId}`}
                  >
                    {element.text}
                  </span>
                );
              } else if (element.type === 'channel_mention') {
                return (
                  <span 
                    key={elementIndex} 
                    className="channel-mention"
                  >
                    {element.text}
                  </span>
                );
              } else if (element.type === 'special_mention') {
                return (
                  <span 
                    key={elementIndex} 
                    className="special-mention"
                  >
                    {element.text}
                  </span>
                );
              } else if (element.type === 'bold') {
                return (
                  <strong key={elementIndex} className="message-bold">
                    {element.text}
                  </strong>
                );
              } else if (element.type === 'italic') {
                return (
                  <em key={elementIndex} className="message-italic">
                    {element.text}
                  </em>
                );
              } else if (element.type === 'strikethrough') {
                return (
                  <span key={elementIndex} className="message-strikethrough">
                    {element.text}
                  </span>
                );
              } else if (element.type === 'code') {
                return (
                  <code key={elementIndex} className="message-code">
                    {element.text}
                  </code>
                );
              } else if (element.type === 'code_block') {
                return (
                  <pre key={elementIndex} className="message-code-block">
                    <code>{element.text}</code>
                  </pre>
                );
              }
              return null;
            })}
          </div>
          
          {/* File attachments */}
          {message.files && message.files.length > 0 && (
            <div className="message-files">
              {message.files.map((file, fileIndex) => {
                const isImage = file.mimetype?.startsWith('image/') || 
                  ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(file.filetype?.toLowerCase() || '');
                
                return (
                  <div key={file.id || fileIndex} className="message-file">
                    {isImage ? (
                      <div className="message-image">
                        {/* Use embedded file_data if available, otherwise fall back to URL */}
                        {file.file_data ? (
                          <>
                            <img 
                              src={`data:${file.file_data_mimetype || file.mimetype};base64,${file.file_data}`}
                              alt={file.title || file.name}
                              className="file-image"
                            />
                            {file.title && file.title !== file.name && (
                              <div className="image-caption">{file.title}</div>
                            )}
                          </>
                        ) : (
                          <>
                            <img 
                              src={file.url_private || file.permalink} 
                              alt={file.title || file.name}
                              className="file-image"
                              onError={(e) => {
                                // Fallback to showing file info if image fails to load
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                                const parent = target.parentElement;
                                if (parent) {
                                  parent.innerHTML = `
                                    <div class="file-info media-error">
                                      <div class="file-icon">🖼️</div>
                                      <div class="file-details">
                                        <div class="file-name">${file.title || file.name}</div>
                                        <div class="file-meta">${file.pretty_type || file.filetype} • ${(file.size / 1024).toFixed(1)} KB</div>
                                        <div class="media-error-message">
                                          <span class="error-icon">⚠️</span>
                                          Image unavailable — Slack file URLs expire over time. Re-export your workspace to capture current images.
                                        </div>
                                      </div>
                                    </div>
                                  `;
                                }
                              }}
                            />
                            {file.title && file.title !== file.name && (
                              <div className="image-caption">{file.title}</div>
                            )}
                          </>
                        )}
                      </div>
                    ) : (
                      <div className="file-info">
                        <div className="file-icon">📎</div>
                        <div className="file-details">
                          <div className="file-name">{file.title || file.name}</div>
                          <div className="file-meta">
                            {file.pretty_type || file.filetype}
                            {file.size && ` • ${(file.size / 1024).toFixed(1)} KB`}
                          </div>
                        </div>
                        {file.file_data ? (
                          <a 
                            href={`data:${file.file_data_mimetype || file.mimetype};base64,${file.file_data}`}
                            download={file.name}
                            className="file-download"
                            style={{ 
                              pointerEvents: 'auto', 
                              position: 'relative', 
                              zIndex: 10
                            }}
                          >
                            Download
                          </a>
                        ) : file.url_private ? (
                          <a 
                            href={file.url_private} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="file-download"
                            style={{ 
                              pointerEvents: 'auto', 
                              position: 'relative', 
                              zIndex: 10
                            }}
                          >
                            Download
                          </a>
                        ) : (
                          <div className="media-error-message">
                            <span className="error-icon">⚠️</span>
                            File unavailable — Slack URLs expire over time
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          
          {message.reactions && message.reactions.length > 0 && (
            <div className="message-reactions">
              {message.reactions.map((reaction, index) => (
                <span key={index} className="reaction">
                  {SlackParser.getEmojiFromName(reaction.name)} {reaction.count}
                </span>
              ))}
            </div>
          )}
          
          {/* Thread replies */}
          {message.thread_replies && message.thread_replies.length > 0 && (
            <div className="thread-replies">
              <div className="thread-header">
                <span className="thread-count">
                  {message.thread_replies.length} {message.thread_replies.length === 1 ? 'reply' : 'replies'}
                </span>
              </div>
              <div className="thread-messages">
                {message.thread_replies.map((reply, index) => {
                  const replyUser = reply.user ? SlackParser.getUserById(users, reply.user) : null;
                  const replyTime = SlackParser.formatDateTime(reply.ts);
                  const replyElements = SlackParser.parseMessageTextToElements(reply, users);
                  
                  return (
                    <div key={reply.ts} className="thread-reply">
                      <div className="thread-reply-avatar">
                        {replyUser?.profile?.image_48 ? (
                          <img 
                            src={replyUser.profile.image_48} 
                            alt={replyUser.real_name}
                            className="thread-avatar-image"
                          />
                        ) : (
                          <div 
                            className={`thread-avatar-placeholder ${replyUser?.color ? 'colored' : ''}`}
                            style={replyUser?.color ? { backgroundColor: `#${replyUser.color}` } : {}}
                          >
                            {replyUser?.real_name?.charAt(0) || '?'}
                          </div>
                        )}
                      </div>
                      <div className="thread-reply-content">
                        <div className="thread-reply-header">
                          <span className="thread-reply-author">
                            {replyUser?.real_name || replyUser?.name || 'Unknown User'}
                          </span>
                          <span className="thread-reply-time">{replyTime}</span>
                          {reply.edited && (
                            <span className="thread-reply-edited">(edited)</span>
                          )}
                        </div>
                        <div className="thread-reply-text">
                          {replyElements.map((element, elementIndex) => {
                            if (typeof element === 'string') {
                              return element.split('\n').map((line, lineIndex) => (
                                <React.Fragment key={`${elementIndex}-${lineIndex}`}>
                                  {line}
                                  {lineIndex < element.split('\n').length - 1 && <br />}
                                </React.Fragment>
                              ));
                            } else if (element.type === 'link') {
                              return (
                                <a 
                                  key={elementIndex} 
                                  href={element.url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="message-link"
                                  style={{ 
                                    pointerEvents: 'auto', 
                                    position: 'relative', 
                                    zIndex: 10,
                                    display: 'inline'
                                  }}
                                >
                                  {element.text}
                                </a>
                              );
                            } else if (element.type === 'user_mention') {
                              return (
                                <span 
                                  key={elementIndex} 
                                  className="user-mention"
                                  title={`User ID: ${element.userId}`}
                                >
                                  {element.text}
                                </span>
                              );
                            } else if (element.type === 'channel_mention') {
                              return (
                                <span 
                                  key={elementIndex} 
                                  className="channel-mention"
                                >
                                  {element.text}
                                </span>
                              );
                            } else if (element.type === 'special_mention') {
                              return (
                                <span 
                                  key={elementIndex} 
                                  className="special-mention"
                                >
                                  {element.text}
                                </span>
                              );
                            } else if (element.type === 'bold') {
                              return (
                                <strong key={elementIndex} className="message-bold">
                                  {element.text}
                                </strong>
                              );
                            } else if (element.type === 'italic') {
                              return (
                                <em key={elementIndex} className="message-italic">
                                  {element.text}
                                </em>
                              );
                            } else if (element.type === 'strikethrough') {
                              return (
                                <span key={elementIndex} className="message-strikethrough">
                                  {element.text}
                                </span>
                              );
                            } else if (element.type === 'code') {
                              return (
                                <code key={elementIndex} className="message-code">
                                  {element.text}
                                </code>
                              );
                            } else if (element.type === 'code_block') {
                              return (
                                <pre key={elementIndex} className="message-code-block">
                                  <code>{element.text}</code>
                                </pre>
                              );
                            }
                            return null;
                          })}
                        </div>
                        {reply.reactions && reply.reactions.length > 0 && (
                          <div className="thread-reply-reactions">
                            {reply.reactions.map((reaction, reactionIndex) => (
                              <span key={reactionIndex} className="reaction">
                                {SlackParser.getEmojiFromName(reaction.name)} {reaction.count}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SlackMessage;
