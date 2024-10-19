import React, { useState, useEffect } from 'react';
import { Camera, MessageSquare, Loader, Key, Save, Trash2, Settings } from 'lucide-react';

interface Conversation {
  id: string;
  messages: { role: string; content: string }[];
}

function App() {
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [chatResponse, setChatResponse] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [apiKey, setApiKey] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [maxTokens, setMaxTokens] = useState(300);
  const [temperature, setTemperature] = useState(0.7);

  useEffect(() => {
    chrome.storage.sync.get(['apiKey', 'conversations', 'maxTokens', 'temperature'], (result) => {
      if (result.apiKey) setApiKey(result.apiKey);
      if (result.conversations) setConversations(result.conversations);
      if (result.maxTokens) setMaxTokens(result.maxTokens);
      if (result.temperature) setTemperature(result.temperature);
    });

    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === 'screenshotTaken') {
        setScreenshot(request.screenshot);
        startNewConversation();
      }
    });
  }, []);

  const takeScreenshot = () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs[0];
      if (activeTab.id) {
        chrome.tabs.sendMessage(activeTab.id, { action: 'takeScreenshot' });
      }
    });
  };

  const startNewConversation = () => {
    const newConversation: Conversation = {
      id: Date.now().toString(),
      messages: []
    };
    setCurrentConversation(newConversation);
    setConversations([...conversations, newConversation]);
    setChatResponse(null);
  };

  const chatWithScreenshot = async () => {
    if (!screenshot || !apiKey || !currentConversation) return;

    setLoading(true);
    setError(null);
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4-vision-preview',
          messages: [
            ...currentConversation.messages,
            {
              role: 'user',
              content: [
                { type: 'text', text: 'What do you see in this image?' },
                { type: 'image_url', image_url: { url: screenshot } }
              ]
            }
          ],
          max_tokens: maxTokens,
          temperature: temperature
        })
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText}`);
      }

      const data = await response.json();
      const newMessage = data.choices[0].message.content;
      setChatResponse(newMessage);

      const updatedConversation = {
        ...currentConversation,
        messages: [
          ...currentConversation.messages,
          { role: 'user', content: 'What do you see in this image?' },
          { role: 'assistant', content: newMessage }
        ]
      };
      setCurrentConversation(updatedConversation);
      setConversations(conversations.map(c => c.id === updatedConversation.id ? updatedConversation : c));
      chrome.storage.sync.set({ conversations: conversations });
    } catch (error) {
      console.error('Error chatting with GPT-4-vision:', error);
      setError(`Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newApiKey = e.target.value;
    setApiKey(newApiKey);
    chrome.storage.sync.set({ apiKey: newApiKey });
  };

  const saveConversation = () => {
    if (currentConversation) {
      chrome.storage.sync.set({ conversations: conversations });
      alert('Conversation saved!');
    }
  };

  const deleteConversation = () => {
    if (currentConversation) {
      const updatedConversations = conversations.filter(c => c.id !== currentConversation.id);
      setConversations(updatedConversations);
      setCurrentConversation(null);
      setChatResponse(null);
      chrome.storage.sync.set({ conversations: updatedConversations });
    }
  };

  const handleSettingsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === 'maxTokens') {
      setMaxTokens(parseInt(value));
      chrome.storage.sync.set({ maxTokens: parseInt(value) });
    } else if (name === 'temperature') {
      setTemperature(parseFloat(value));
      chrome.storage.sync.set({ temperature: parseFloat(value) });
    }
  };

  return (
    <div className="w-96 p-4 bg-gray-100">
      <h1 className="text-2xl font-bold mb-4">Screenshot Chat</h1>
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <Key className="text-gray-500" />
          <input
            type="password"
            placeholder="Enter API Key"
            value={apiKey}
            onChange={handleApiKeyChange}
            className="flex-grow p-2 border rounded"
          />
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 bg-gray-200 rounded"
          >
            <Settings />
          </button>
        </div>
        {showSettings && (
          <div className="bg-white p-4 rounded border border-gray-300">
            <h2 className="font-bold mb-2">Settings</h2>
            <div className="space-y-2">
              <div>
                <label htmlFor="maxTokens" className="block">Max Tokens:</label>
                <input
                  type="number"
                  id="maxTokens"
                  name="maxTokens"
                  value={maxTokens}
                  onChange={handleSettingsChange}
                  className="w-full p-2 border rounded"
                />
              </div>
              <div>
                <label htmlFor="temperature" className="block">Temperature:</label>
                <input
                  type="number"
                  id="temperature"
                  name="temperature"
                  value={temperature}
                  onChange={handleSettingsChange}
                  step="0.1"
                  min="0"
                  max="1"
                  className="w-full p-2 border rounded"
                />
              </div>
            </div>
          </div>
        )}
        <button
          className="w-full bg-blue-500 text-white py-2 px-4 rounded flex items-center justify-center"
          onClick={takeScreenshot}
        >
          <Camera className="mr-2" /> Take Screenshot
        </button>
        {screenshot && (
          <>
            <img src={screenshot} alt="Screenshot" className="w-full border border-gray-300 rounded" />
            <button
              className="w-full bg-green-500 text-white py-2 px-4 rounded flex items-center justify-center"
              onClick={chatWithScreenshot}
              disabled={loading || !apiKey}
            >
              {loading ? <Loader className="animate-spin mr-2" /> : <MessageSquare className="mr-2" />}
              {loading ? 'Processing...' : 'Chat with Screenshot'}
            </button>
          </>
        )}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
            {error}
          </div>
        )}
        {chatResponse && (
          <div className="bg-white p-4 rounded border border-gray-300">
            <h2 className="font-bold mb-2">GPT-4-vision Response:</h2>
            <p>{chatResponse}</p>
          </div>
        )}
        {currentConversation && (
          <div className="flex space-x-2">
            <button
              className="flex-1 bg-yellow-500 text-white py-2 px-4 rounded flex items-center justify-center"
              onClick={saveConversation}
            >
              <Save className="mr-2" /> Save
            </button>
            <button
              className="flex-1 bg-red-500 text-white py-2 px-4 rounded flex items-center justify-center"
              onClick={deleteConversation}
            >
              <Trash2 className="mr-2" /> Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;