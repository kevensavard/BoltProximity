chrome.runtime.onInstalled.addListener(() => {
      chrome.storage.local.set({ chatRooms: {} });
    });

    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      if (changeInfo.status === 'complete' && tab.url) {
        const url = new URL(tab.url).hostname;
        chrome.storage.local.get(['chatRooms'], (result) => {
          const chatRooms = result.chatRooms || {};
          if (!chatRooms[url]) {
            chatRooms[url] = {
              participants: [],
              messages: []
            };
            chrome.storage.local.set({ chatRooms });
          }
        });
      }
    });
