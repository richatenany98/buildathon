import { useState, useEffect } from 'react';
import api from '../api';

export default function SlackIntegration({ onConnected }) {
  const [loading, setLoading] = useState(false);
  const [removingChannel, setRemovingChannel] = useState(null); // Track which channel is being removed
  const [connected, setConnected] = useState(false);
  const [channels, setChannels] = useState([]);
  const [configuredChannels, setConfiguredChannels] = useState([]);
  const [selectedChannels, setSelectedChannels] = useState([]);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = async () => {
    try {
      // Try to fetch configured channels - if successful, we're connected
      const response = await api.get('/api/slack/channels/configured');
      setConfiguredChannels(response.data.channels);
      setConnected(true);
      
      // Also fetch available channels
      const channelsResponse = await api.get('/api/slack/channels');
      setChannels(channelsResponse.data.channels);
    } catch (err) {
      setConnected(false);
      setChannels([]);
      setConfiguredChannels([]);
    }
  };

  const connectToSlack = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.get('/api/slack/oauth/url');
      
      // Open Slack OAuth in a new window
      const popup = window.open(
        response.data.url,
        'slack-oauth',
        'width=600,height=600,scrollbars=yes,resizable=yes'
      );

      // Listen for popup to close
      const checkClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkClosed);
          checkConnection();
          setLoading(false);
        }
      }, 1000);

    } catch (err) {
      setError('Failed to connect to Slack');
      setLoading(false);
    }
  };

  const configureChannels = async () => {
    if (selectedChannels.length === 0) {
      setError('Please select at least one channel');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const response = await api.post('/api/slack/channels/configure', {
        channels: selectedChannels
      });

      setConfiguredChannels(prev => [
        ...prev,
        ...response.data.channels.filter(newChannel => 
          !prev.some(existing => existing.channel_id === newChannel.channel_id)
        )
      ]);
      
      setSelectedChannels([]);
      setSuccess(`Successfully configured ${response.data.configured_channels} channels`);
      
      if (onConnected) {
        onConnected();
      }
    } catch (err) {
      setError('Failed to configure channels');
    } finally {
      setLoading(false);
    }
  };

  const removeChannel = async (channelId) => {
    try {
      setRemovingChannel(channelId);
      setError(null);
      
      await api.delete(`/api/slack/channels/${channelId}`);
      
      // Remove from local state immediately
      setConfiguredChannels(prev => 
        prev.filter(channel => channel.channel_id !== channelId)
      );
      
      // Also refresh the available channels list in case the removed channel should be shown again
      try {
        const channelsResponse = await api.get('/api/slack/channels');
        setChannels(channelsResponse.data.channels);
      } catch (refreshErr) {
        console.warn('Could not refresh available channels:', refreshErr);
      }
      
      setSuccess('Channel removed from monitoring');
      
      // Trigger dashboard refresh if callback provided
      if (onConnected) {
        onConnected();
      }
    } catch (err) {
      console.error('Error removing channel:', err);
      setError(err?.response?.data?.message || 'Failed to remove channel');
    } finally {
      setRemovingChannel(null);
    }
  };




  if (!connected) {
    return (
      <div className="slack-integration">
        <div className="integration-card">
          <div className="slack-logo">
            <img src="/slack-logo.png" alt="Slack" width="48" height="48" />
          </div>
          <h3>Connect to Slack</h3>
          <p>
            Connect your Slack workspace to start monitoring team sentiment. 
            This will allow the system to analyze messages and reactions from your channels.
          </p>
          
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}
          
          <button 
            className="btn btn-primary slack-btn"
            onClick={connectToSlack}
            disabled={loading}
          >
            {loading ? 'Connecting...' : 'Connect to Slack'}
          </button>
          
          <div className="integration-info">
            <h4>What we'll access:</h4>
            <ul>
              <li>Read messages from selected channels</li>
              <li>Read reactions to messages</li>
              <li>Access basic channel information</li>
            </ul>
            <p className="privacy-note">
              We respect your privacy. Message content is only used for sentiment analysis and is not stored permanently.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="slack-integration connected">
      <div className="integration-header">
        <div className="slack-status">
          <span className="status-indicator connected"></span>
          <span>Connected to Slack</span>
        </div>
      </div>

      {(error || success) && (
        <div className={`message ${error ? 'error' : 'success'}`}>
          {error || success}
        </div>
      )}

      {/* Configured Channels */}
      <div className="configured-channels">
        <h4>Monitored Channels ({configuredChannels.length})</h4>
        {configuredChannels.length === 0 ? (
          <p className="no-channels">No channels configured yet</p>
        ) : (
          <div className="channels-list">
            {configuredChannels.map(channel => (
              <div key={channel.channel_id} className="channel-item">
                <span className="channel-name">#{channel.channel_name}</span>
                <span className="channel-team">{channel.team_id}</span>
                <button 
                  className="btn btn-small btn-danger"
                  onClick={() => removeChannel(channel.channel_id)}
                  disabled={removingChannel === channel.channel_id}
                >
                  {removingChannel === channel.channel_id ? 'Removing...' : 'Remove'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Available Channels */}
      <div className="available-channels">
        <h4>Add Channels</h4>
        <p>Select channels to monitor for sentiment analysis:</p>
        
        <div className="channels-grid">
          {channels
            .filter(channel => !configuredChannels.some(configured => 
              configured.channel_id === channel.id))
            .map(channel => (
            <label key={channel.id} className="channel-checkbox">
              <input
                type="checkbox"
                checked={selectedChannels.includes(channel.id)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedChannels(prev => [...prev, channel.id]);
                  } else {
                    setSelectedChannels(prev => prev.filter(id => id !== channel.id));
                  }
                }}
              />
              <span className="checkmark"></span>
              <div className="channel-info">
                <span className="channel-name">#{channel.name}</span>
                <span className="channel-meta">
                  {channel.num_members} members • {channel.is_private ? 'Private' : 'Public'}
                </span>
              </div>
            </label>
          ))}
        </div>

        {selectedChannels.length > 0 && (
          <div className="selection-actions">
            <p>{selectedChannels.length} channels selected</p>
            <button 
              className="btn btn-primary"
              onClick={configureChannels}
              disabled={loading}
            >
              {loading ? 'Configuring...' : 'Add Selected Channels'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

