const backendUrl = "http://127.0.0.1:5000/api/chatbox";


// Event listener for DOMContentLoaded
document.addEventListener("DOMContentLoaded", function() {
    // Create a new URLSearchParams object with the current URL's search parameters
    
    fetch(backendUrl + '/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ user: localStorage.getItem("user_id"), password: localStorage.getItem("password") })
      })
        .then(response => response.json())
        .then(data => {
      if (!data.SUCCESS) {
        window.location.href = "./login/index.html";
      }
    })
    
    if (!sessionStorage.getItem("chat_id")) {
        sessionStorage.setItem("chat_id", "main_chat")
    }
    
    openStartUp();
    
    setInterval(reloadMessagesIfNeeded, 1000)
    setInterval(reloadChatsIfNeeded, 1000)
    
    setInterval(updateUnreadChats, 1000)


    // Add event listener to user list items
    const userListContainer = document.getElementById('userList');
    userListContainer.addEventListener('click', function(event) {
        if (event.target.tagName === 'P') {
            const clickedUserName = event.target.textContent;
            appendToSearchBar(clickedUserName);



            // Prevent default behavior to maintain focus on the search bar
            event.preventDefault();
        }
    });

    // Add event listener to add user list items
    const addUserListContainer = document.getElementById('addUserList');
    addUserListContainer.addEventListener('click', function(event) {
        if (event.target.tagName === 'P') {
            const clickedUserName = event.target.textContent;
            appendToSearchBarForAddUser(clickedUserName);



            // Prevent default behavior to maintain focus on the search bar
            event.preventDefault();
        }
    });

    if (localStorage.getItem("theme")) {
        document.getElementById("themeSelect").value = localStorage.getItem("theme")
        setTheme(localStorage.getItem("theme"))
    } else {
        setTheme("auto")
    }

    if (localStorage.getItem("font_size")) {
        document.getElementById("fontSizeSlider").value = localStorage.getItem("font_size")
        document.getElementById("fontSizeSlider-value").textContent = localStorage.getItem("font_size") + "px"
        document.getElementById("chat-messages").style.fontSize = localStorage.getItem("font_size") + "px";
    }

    if (localStorage.getItem("send_key")) {
        document.getElementById("sendKeySelect").value = localStorage.getItem("send_key");
    } else {
        localStorage.setItem("send_key", document.getElementById("sendKeySelect").value);
    }

    if (localStorage.getItem("time_stamp")) {
        document.getElementById("timeStampSelect").value = localStorage.getItem("time_stamp");
    } else {
        localStorage.setItem("time_stamp", document.getElementById("timeStampSelect").value);
    }

});


function escapeHtml(text) {
    const escapeMap = {
        '\n': '<br>',
        '\t': '&emsp;',
        '<': '&lt;',
        '>': '&gt;',
        '&': '&amp;',
        '"': '&quot;',
        "'": '&#39;'
    };

    // Replace special characters with their HTML entity representations
    // <>&"'
    text = text.replace(/[\n\t]/g, (match) => escapeMap[match]);

    // Replace image(URL) with <img> tag
    text = text.replace(/image\(([^,]+)\)/g, '<img src="$1" width="25%"></img>');

    // Replace image(URL,WIDTH) with <img> tag with specified width
    text = text.replace(/image\(([^,]+),\s*([^)]+)\)/g, function(match, url, width) {
        // Attempt to parse width as a percentage
        const parsedWidth = parseFloat(width);
        // If width is a valid percentage, use it, otherwise default to 100%
        const imgWidth = parsedWidth >= 0 && parsedWidth <= 1 ? `${parsedWidth * 100}%` : '25%';
        return `<img src="${url}" width="${imgWidth}"></img>`;
    });

    // Replace link(URL) with <a> tag
    text = text.replace(/link\(([^,]+)\)/g, '<a href="$1">$1</a>');

    // Replace link(URL,NAME) with <a> tag with specified name
    text = text.replace(/link\(([^,]+),\s*([^)]+)\)/g, '<a href="$1">$2</a>');

    // Replace bold(TEXT) with <b> tag
    text = text.replace(/bold\(([^)]+)\)/g, '<b>$1</b>');

    // Replace big(TEXT) with <h2> tag
    text = text.replace(/big\(([^)]+)\)/g, '<big><big><big><big>$1</big></big></big></big>');

    // Replace italic(TEXT) with <i> tag
    text = text.replace(/italic\(([^)]+)\)/g, '<i>$1</i>');

    // Replace slash(TEXT) with <s> tag
    text = text.replace(/slash\(([^)]+)\)/g, '<s>$1</s>');

    text = text.replace(/GameParrot\(([^,]+),\s*([^)]+)\)/g, `<button onclick="openGameParrot('$1', '$2')">GameParrot</button>`);
    // Convert special syntax to HTML
    return text;
}



function getMessages() {
    let userId = localStorage.getItem("user_id");
    let password = localStorage.getItem("password");
    let chatId = sessionStorage.getItem("chat_id");

    fetch(backendUrl + '/getMessages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                user_id: userId,
                chat_id: chatId,
                password: password
            }),
        })
        .then(response => response.json())
        .then(data => {
            if (data.SUCCESS) {
                const messagesContainer = document.getElementById('chat-messages');
                const isUserAtBottom = isUserAtBottomOfContainer(messagesContainer);
                const showTimeStamp = localStorage.getItem("time_stamp")
                displayMessages(data.messages, isUserAtBottom, showTimeStamp);
            } else {
                showError(data.error)
            }
        });
}

function reloadMessagesIfNeeded() {
    let userId = localStorage.getItem("user_id");
    let password = localStorage.getItem("password");
    let chatId = sessionStorage.getItem("chat_id");
    fetch(backendUrl + '/getAmountOfMessages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                user_id: userId,
                chat_id: chatId,
                password: password
            }),
        })
        .then(response => response.json())
        .then(data => {
            if (data.SUCCESS) {

                let numberOfMessagesDisplayed = document.querySelectorAll('.message-bubble').length;

                if (data.amount !== numberOfMessagesDisplayed) {
                    getMessages(); // Fetch messages again
                }
            } else {
                showError(data.error)
            }
        });
}



function displayMessages(messages, isUserAtBottom, timeStamp) {
    const container = document.getElementById('chat-messages');
    container.innerHTML = '';

    // Convert object keys into an array of message keys
    const messageKeys = Object.keys(messages);

    // Sort message keys based on the numeric part of the key
    messageKeys.sort((a, b) => {
        const numA = parseInt(a.replace('message', ''));
        const numB = parseInt(b.replace('message', ''));
        return numA - numB;
    });

    // Reverse the sorted message keys
    messageKeys.reverse();

    // Display messages in reversed sorted order
    messageKeys.forEach(key => {
        const msg = messages[key];
        const div = document.createElement('div');
        div.className = 'message-bubble';

        const name = msg.name;
        const timestamp = msg.timestamp;
        let message = msg.message;



        if (timeStamp == "show") {
            div.innerHTML = `
            <div class="name">${name}: </div>
            <div class="message">${escapeHtml(message)}</div>
            <div class="time">${timestamp}</div>
        `;
        } else if (timeStamp == "hide") {
            div.innerHTML = `
            <div class="name">${name}: </div>
            <div class="message">${escapeHtml(message)}</div>
        `;
        }

        container.appendChild(div);
    });

    if (isUserAtBottom) {
        scrollToBottom(container);
    }
}



function isUserAtBottomOfContainer(container) {
    return container.scrollHeight - container.clientHeight <= container.scrollTop + 1;
}

function scrollToBottom(container) {
    container.scrollTop = container.scrollHeight;
}

function sendMessage() {
    let userId = localStorage.getItem("user_id");
    let password = localStorage.getItem("password");
    let chatId = sessionStorage.getItem("chat_id");
    const userInput = document.getElementById('myTextarea').value;

    document.getElementById('myTextarea').value = '';
    autoExpand(document.getElementById('myTextarea'));


    fetch(backendUrl + "/sendMessage", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                user_id: userId,
                password: password,
                chat_id: chatId,
                message: userInput
            }),
        })
        .then(response => response.json())
        .then(data => {
            if (!data.SUCCESS) {
                showError(data.error)
            }
        });
}

function showError(errorMessage) {
    var errorMessageDiv = document.getElementById('errorMessage');

    // If error message container already exists, update its content
    if (errorMessageDiv) {
        var errorContent = errorMessageDiv.querySelector('span');
        errorContent.innerHTML = `<strong>Error:</strong> <span>${errorMessage}</span>`;
        return; // Exit function to avoid creating a new container
    }

    // Create error message container div
    errorMessageDiv = document.createElement('div');
    errorMessageDiv.id = 'errorMessage';
    document.body.appendChild(errorMessageDiv);

    errorMessageDiv.style.position = 'absolute';
    errorMessageDiv.style.zIndex = '999999';
    
    errorMessageDiv.style.top = '10%';
    errorMessageDiv.style.left = '50%';
    errorMessageDiv.style.transform = 'translateX(-50%)';
    errorMessageDiv.style.backgroundColor = '#f44336';
    errorMessageDiv.style.color = 'white';
    errorMessageDiv.style.padding = '20px';
    errorMessageDiv.style.borderRadius = '5px';
    errorMessageDiv.style.display = 'none';

    // Create close button span
    var closeButton = document.createElement('span');
    closeButton.innerHTML = '&times;';
    closeButton.style.color = 'white';
    closeButton.style.float = 'right';
    closeButton.style.fontSize = '20px';
    closeButton.style.fontWeight = 'bold';
    closeButton.style.cursor = 'pointer';
    closeButton.style.marginLeft = '10px'; // Add margin between close button and error content
    closeButton.onclick = function() {
        document.body.removeChild(errorMessageDiv);
    };

    // Create error message content
    var errorContent = document.createElement('span');
    errorContent.innerHTML = `<strong>Error:</strong> <span>${errorMessage}</span>`;

    // Append elements to error message container
    errorMessageDiv.appendChild(errorContent);
    errorMessageDiv.appendChild(closeButton);

    // Display error message
    errorMessageDiv.style.display = 'block';
}


function reloadChatsIfNeeded() {
    let userId = localStorage.getItem("user_id");
    let password = localStorage.getItem("password");
    let chatId = sessionStorage.getItem("chat_id");
    fetch(backendUrl + '/getAmountOfChats', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                user_id: userId,
                chat_id: chatId,
                password: password
            }),
        })
        .then(response => response.json())
        .then(data => {
            if (data.SUCCESS) {
                let numberOfChatsDisplayed = document.querySelectorAll('.chat-button').length;

                if (data.amount !== numberOfChatsDisplayed) {
                    getChats(); // Fetch messages again
                }
            } else {
                showError(data.error)
            }
        });
}


function showChatMembers(chatId, chatMembers) {
    const popup = document.createElement('div');
    popup.className = 'chat-members-popup';
    popup.innerHTML = `<p>Chat Members:</p><p>${chatMembers}</p>`;
    document.body.appendChild(popup);

    const button = document.querySelector(`#${chatId}`);
    const buttonRect = button.getBoundingClientRect();

    popup.style.top = `${buttonRect.bottom}px`;
    popup.style.left = `${buttonRect.left}px`;

    document.addEventListener('click', function closePopup(e) {
        if (!popup.contains(e.target) && e.target !== button) {
            popup.remove();
            document.removeEventListener('click', closePopup);
        }
    });
}

function getChats() {
    const userId = localStorage.getItem("user_id");
    const password = localStorage.getItem("password");
    fetch(backendUrl + '/getChats', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                user_id: userId,
                password: password
            }),
        })
        .then(response => response.json())
        .then(data => {
            const chatListContainer = document.querySelector('.chat-list');

            // Clear existing buttons
            chatListContainer.innerHTML = '';

            // Iterate over each chat and create a button for it
            Object.keys(data.chats).forEach(chatId => {
                const chatName = data.chats[chatId]["name"];
                const chatMembers = data.chats[chatId]["members"].join(', ');
            
                const buttonString = `<button id="${chatId}" class="chat-button" onclick="switchChat('${chatId}')">${chatName}</button>`;
                chatListContainer.insertAdjacentHTML('beforeend', buttonString);
            });


            // Switch to the chat that was active before
            const chatId = sessionStorage.getItem("chat_id");
            switchChat(chatId);

            var contextMenu = document.querySelector(".wrapperfortheclick");

            document.querySelectorAll(".chat-list .chat-button").forEach(button => {
                if (button.id == "main_chat") {
                    return
                }
                // Add context menu event listener to each button
                // Add context menu event listener to each button
                button.addEventListener("contextmenu", e => {
                    e.preventDefault();

                    // Get mouse coordinates
                    const mouseX = e.clientX;
                    const mouseY = e.clientY;

                    // Get viewport dimensions
                    const viewportWidth = window.innerWidth;
                    const viewportHeight = window.innerHeight;

                    // Calculate maximum allowed positions
                    const maxX = viewportWidth - contextMenu.offsetWidth;
                    const maxY = viewportHeight - contextMenu.offsetHeight;

                    // Set context menu position
                    let menuX = mouseX;
                    let menuY = mouseY;

                    if (mouseX > maxX) {
                        menuX = maxX;
                    }
                    if (mouseY > maxY) {
                        menuY = maxY;
                    }

                    contextMenu.style.visibility = "visible";
                    contextMenu.style.left = menuX + "px";
                    contextMenu.style.top = menuY + "px";

                    // Store the current chat ID
                    sessionStorage.setItem("current_chat", button.id);
                    
                });

            });

            document.addEventListener("click", () => contextMenu.style.visibility = "hidden");
        });
}

function switchChat(chatId) {
    // Remove the "selected" class from previously selected chat button, if any
    const previouslySelectedButton = document.querySelector('.chat-button.selected');
    if (previouslySelectedButton) {
        previouslySelectedButton.classList.remove('selected');
    }

    // Add the "selected" class to the newly selected chat button
    const newlySelectedButton = document.getElementById(chatId);
    if (newlySelectedButton) {
        newlySelectedButton.classList.add('selected');
    }

    // Update the session storage with the new chat ID
    sessionStorage.setItem("chat_id", chatId);

    // Fetch and display messages for the newly selected chat
    getMessages();
}

function autoExpand(element) {


    var charCount = element.value.length;
    var maxChar = element.getAttribute("maxlength");
    document.getElementById(element.getAttribute('characterlimittextid')).textContent = charCount + "/" + maxChar;



    // Reset the height to allow it to shrink
    element.style.height = "auto";

    // Set the correct height based on the scroll height and the line height
    element.style.height = (element.scrollHeight - 2 * parseFloat(window.getComputedStyle(element).getPropertyValue('padding-top'))) + "px";
}

function handleKeyPress(event) {
    var sendKey = localStorage.getItem("send_key");
    // Check if the stored sendKey value contains a "+" indicating it's a key combination
    if (sendKey.includes("+")) {
        const keys = sendKey.split("+"); // Split the key combination
        const mainKey = keys.pop(); // Extract the main key (last in the sequence)

        // Check if the main key matches and all other keys in the combination are pressed
        if (event.key === mainKey && keys.every(k => event.getModifierState(k))) {
            event.preventDefault(); // Prevent the default Enter behavior
            sendMessage();
        }
    } else { // Handle single key press
        if (event.key === sendKey && !event.shiftKey) {
            event.preventDefault(); // Prevent the default Enter behavior
            sendMessage();
        }
    }
}

function handleKeyPressForCreateChat(event) {
    var sendKey = localStorage.getItem("send_key");
    // Check if the stored sendKey value contains a "+" indicating it's a key combination
    if (sendKey.includes("+")) {
        const keys = sendKey.split("+"); // Split the key combination
        const mainKey = keys.pop(); // Extract the main key (last in the sequence)

        // Check if the main key matches and all other keys in the combination are pressed
        if (event.key === mainKey && keys.every(k => event.getModifierState(k))) {
            event.preventDefault(); // Prevent the default Enter behavior
            createChat();
        }
    } else { // Handle single key press
        if (event.key === sendKey && !event.shiftKey) {
            event.preventDefault(); // Prevent the default Enter behavior
            createChat();
        }
    }
}

function setTheme(theme) {
    const systemDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;

    if (theme === "auto") {
        theme = systemDarkMode ? "dark" : "light";
    }

    const styleLinks = document.querySelectorAll('link[rel="stylesheet"]');
    styleLinks.forEach(link => {
        if (link.href.includes("style-")) {
            link.href = `./src/style-${theme}.css`;
        }
    });

    window.matchMedia('(prefers-color-scheme: dark)').addListener(e => {
        const newTheme = e.matches ? "dark" : "light";
        if (theme === "auto") {
            setTheme(newTheme);
        }
    });
}

function resetSettings() {
    document.getElementById("fontSizeSlider").value = "16"
    document.getElementById("fontSizeSlider-value").textContent = "16px";
    document.getElementById("chat-messages").style.fontSize = "16px";
    localStorage.setItem("font_size", "16");

    document.getElementById('themeSelect').value = "auto"
    localStorage.setItem("theme", "auto")
    setTheme("auto")

    document.getElementById('sendKeySelect').value = "Enter"
    localStorage.setItem("send_key", "Enter")

    document.getElementById('timeStampSelect').value = "show"
    localStorage.setItem("time_stamp", "show")
    getMessages()

}

document.addEventListener('click', function(event) {
    const sidebar = document.querySelector('.sidebar');
    const hambergurButton = document.querySelector('#hamburgerBtn');

    // Check if the clicked element is not the sidebar or the hamburger button
    if (!sidebar.contains(event.target) && event.target !== hambergurButton) {
        sidebar.classList.remove('open');
        hambergurButton.classList.remove('change');
        sidebar.style.right = '-300px'; // Or whatever the original value is
    }
});

function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const hambergurButton = document.querySelector('#hamburgerBtn');

    sidebar.classList.toggle('open');
    hambergurButton.classList.toggle('hamburger-change');

    if (sidebar.classList.contains('open')) {
        sidebar.style.right = '0';
    } else {
        sidebar.style.right = '-300px'; // Or whatever the original value is
    }
}

document.getElementById("fontSizeSlider").addEventListener("input", function() {
    // Get the slider element
    var slider = document.getElementById("fontSizeSlider");
    // Get the span element
    var span = document.getElementById("fontSizeSlider-value");
    // Update the span text with the slider value
    var chatContainer = document.getElementById("chat-messages");

    chatContainer.style.fontSize = slider.value + "px";

    span.textContent = slider.value + "px";
    localStorage.setItem("font_size", slider.value);
});

document.getElementById('themeSelect').addEventListener('change', function() {
    var input = document.getElementById('themeSelect')
    localStorage.setItem("theme", input.value)

    setTheme(input.value)
    // You can perform further actions based on the selected theme here
});

document.getElementById('timeStampSelect').addEventListener('change', function() {
    var input = document.getElementById('timeStampSelect')
    localStorage.setItem("time_stamp", input.value)

    getMessages()
    // You can perform further actions based on the selected time here
});

document.getElementById('sendKeySelect').addEventListener('change', function() {
    var input = document.getElementById('sendKeySelect')
    localStorage.setItem("send_key", input.value)

    // You can perform further actions based on the selected theme here
});

function createChat() {
    let userId = localStorage.getItem("user_id");
    let password = localStorage.getItem("password");

    // Retrieve values from HTML elements
    let chatName = document.querySelector('.name-chat').value;
    let members = document.querySelector('.search-bar').value;
    let message = document.getElementById('newChatMessageInput').value;
    members = members.split(', ').map(name => name.trim()); // Get existing names

    fetch(backendUrl + "/createChat", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                user_id: userId,
                password: password,
                chat_name: chatName,
                message: message,
                members: members
            }),
        })
        .then(response => response.json())
        .then(data => {
            if (!data.SUCCESS) {
                showError(data.error)
            } else {
                document.querySelector('.name-chat').value = "";
                document.querySelector('.search-bar').value = "";
                document.getElementById('newChatMessageInput').value = "";
                autoExpand(document.getElementById('newChatMessageInput'));
                closeCreateChat()
                switchChat(data.chat_id)
            }
        });
}


function openCreateChat() {
    document.getElementById('popupContainer').style.display = 'block';

    let userId = localStorage.getItem("user_id");
    let password = localStorage.getItem("password");

    fetch(backendUrl + "/getAllUsers", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                user_id: userId,
                password: password
            }),
        })
        .then(response => response.json())
        .then(data => {
            if (data.SUCCESS) {

                // Get the user list container
                const userListContainer = document.getElementById('userList');

                // Clear existing user list
                userListContainer.innerHTML = '';

                // Iterate over each user and create a list item for it
                data.users.forEach(username => {
                    if (username != localStorage.getItem("username")) {
                        const listItem = document.createElement('p');
                        listItem.textContent = username;
                        userListContainer.appendChild(listItem);
                    }
                });
            } else {
                showError(data.error);
            }
        });
}

function closeCreateChat() {
    document.getElementById('popupContainer').style.display = 'none';
}




function filterUserList(fullSearchQuery) {
    searchQuery = fullSearchQuery.split(', ').pop().trim();
    const userListItems = document.querySelectorAll('.user-list p');
    userListItems.forEach(function(userListItem) {
        const userName = userListItem.textContent.toLowerCase();
        if (userName.includes(searchQuery) && !fullSearchQuery.includes(userListItem.textContent)) {
            userListItem.style.display = 'block';
        } else {
            userListItem.style.display = 'none';
        }
    });
}

function appendToSearchBar(userName) {
    const searchBar = document.querySelector('.search-bar');
    const existingNames = searchBar.value.split(', ').map(name => name.trim()); // Get existing names

    // Check if the username already exists
    if (!existingNames.includes(userName)) {
        if (searchBar.value && existingNames.length != 1) {
            searchBar.value = searchBar.value.split(', ').slice(0, -1).join(', ') + ', ';
        } else {
            searchBar.value = searchBar.value.split(', ').slice(0, -1).join(', ');
        }
        searchBar.value += `${userName}, `; // Append clicked user to search bar
        const searchQuery = document.querySelector('.search-bar').value;
        filterUserList(searchQuery);
    }
}


//new things

function addUser() {
    let userId = localStorage.getItem("user_id");
    let password = localStorage.getItem("password");
    let chatId = sessionStorage.getItem("current_chat");
    // Retrieve values from HTML elements
    let members = document.querySelector('.add-user-search-bar').value;
    members = members.split(', ').map(name => name.trim()); // Get existing names
    fetch(backendUrl + "/addUsers", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                user_id: userId,
                password: password,
                chat_id: chatId,
                new_users: members
            }),
        })
        .then(response => response.json())
        .then(data => {
            if (!data.SUCCESS) {
                showError(data.error)
            } else {
                document.querySelector('.add-user-search-bar').value = "";
                closeAddUser()
            }
        });
}


function openAddUserPopup() {
    document.getElementById('addUserPopupContainer').style.display = 'block';

    let userId = localStorage.getItem("user_id");
    let password = localStorage.getItem("password");
    let chatId = sessionStorage.getItem("current_chat")

    fetch(backendUrl + "/getUsersNotInChat", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                user_id: userId,
                password: password,
                chat_id: chatId
            }),
        })
        .then(response => response.json())
        .then(data => {
            if (data.SUCCESS) {

                // Get the user list container
                const userListContainer = document.getElementById('addUserList');

                // Clear existing user list
                userListContainer.innerHTML = '';

                // Iterate over each user and create a list item for it
                data.users.forEach(username => {
                    if (username != localStorage.getItem("username")) {
                        const listItem = document.createElement('p');
                        listItem.textContent = username;
                        userListContainer.appendChild(listItem);
                    }
                });
            } else {
                showError(data.error);
            }
        });
}

function closeAddUser() {
    document.getElementById('addUserPopupContainer').style.display = 'none';
}




function filterAddUserList(fullSearchQuery) {
    searchQuery = fullSearchQuery.split(', ').pop().trim();
    const userListItems = document.querySelectorAll('.add-user-list p');
    userListItems.forEach(function(userListItem) {
        const userName = userListItem.textContent.toLowerCase();
        if (userName.includes(searchQuery) && !fullSearchQuery.includes(userListItem.textContent)) {
            userListItem.style.display = 'block';
        } else {
            userListItem.style.display = 'none';
        }
    });
}

function appendToSearchBarForAddUser(userName) {
    const searchBar = document.querySelector('.add-user-search-bar');
    const existingNames = searchBar.value.split(', ').map(name => name.trim()); // Get existing names

    // Check if the username already exists
    if (!existingNames.includes(userName)) {
        if (searchBar.value && existingNames.length != 1) {
            searchBar.value = searchBar.value.split(', ').slice(0, -1).join(', ') + ', ';
        } else {
            searchBar.value = searchBar.value.split(', ').slice(0, -1).join(', ');
        }
        searchBar.value += `${userName}, `; // Append clicked user to search bar
        const searchQuery = document.querySelector('.add-user-search-bar').value;
        filterAddUserList(searchQuery);
    }
}




//are you sure popup

function openAreYouSure() {
    document.getElementById('areYouSurePopupContainer').style.display = 'block';
}

function closeAreYouSure() {
    document.getElementById('areYouSurePopupContainer').style.display = 'none';
}




function removeUser() {
    let userId = localStorage.getItem("user_id");
    let password = localStorage.getItem("password");
    let chatId = sessionStorage.getItem("current_chat")
    closeAreYouSure()
    fetch(backendUrl + "/removeMe", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                user_id: userId,
                password: password,
                chat_id: chatId
            }),
        })
        .then(response => response.json())
        .then(data => {
            if (data.SUCCESS) {
                
                if (sessionStorage.getItem("current_chat") == sessionStorage.getItem("chat_id")) {
                    switchChat("main_chat");
                }
            } else {
                showError(data.error);
            }
        });
}


function updateNameChatCharacterCount() {
    var textInput = document.getElementById("enterChatName");
    var characterCount = textInput.value.length
    var maxLength = parseInt(textInput.getAttribute("maxlength"));
    var countDisplay = document.getElementById("nameChatCharCount");
    countDisplay.textContent = characterCount + "/" + maxLength;
}
function updateRenameChatCharacterCount() {
    var textInput = document.getElementById("renameChatName");
    var characterCount = textInput.value.length
    var maxLength = parseInt(textInput.getAttribute("maxlength"));
    var countDisplay = document.getElementById("renameChatCharCount");
    countDisplay.textContent = characterCount + "/" + maxLength;
}

//rename chat 

function openRenameChat() {
    document.getElementById('renameContainer').style.display = 'block';
}

function closeRenameChat() {
    document.getElementById('renameContainer').style.display = 'none';
}

function renameChat() {
    let userId = localStorage.getItem("user_id");
    let password = localStorage.getItem("password");
    let chatId = sessionStorage.getItem("current_chat")
    // Retrieve values from HTML elements
    let chatName = document.getElementById('renameChatName').value;

    fetch(backendUrl + "/renameChat", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                user_id: userId,
                password: password,
                chat_name: chatName,
                chat_id: chatId
            }),
        })
        .then(response => response.json())
        .then(data => {
            if (!data.SUCCESS) {
                showError(data.error)
            } else {
                document.getElementById('renameChatName').value = "";
                closeRenameChat()
                getChats()
            }
        });
}



//start up popup

function openStartUp() {
    document.getElementById('startUpContainer').style.display = 'block';
}

function closeStartUp() {
    document.getElementById('startUpContainer').style.display = 'none';
}


//see user popup

function openSeeUser() {
    document.getElementById('seeUserPopupContainer').style.display = 'block';

    let userId = localStorage.getItem("user_id");
    let password = localStorage.getItem("password");
    let chatId = sessionStorage.getItem("current_chat")

    fetch(backendUrl + "/getUsersInChat", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                user_id: userId,
                password: password,
                chat_id: chatId
            }),
        })
        .then(response => response.json())
        .then(data => {
            if (data.SUCCESS) {

                // Get the user list container
                const userListContainer = document.getElementById('seeUserList');

                // Clear existing user list
                userListContainer.innerHTML = '';

                // Iterate over each user and create a list item for it
                data.users.forEach(username => {
                    const listItem = document.createElement('p');
                    listItem.textContent = username;
                    userListContainer.appendChild(listItem);
                });
            } else {
                showError(data.error);
            }
        });
}

function closeSeeUser() {
    document.getElementById('seeUserPopupContainer').style.display = 'none';
}


//change password and user ID
function changePassword() {
    let userId = localStorage.getItem("user_id");
    let password = localStorage.getItem("password");
    // Retrieve values from HTML elements
    let newPassword = document.getElementById('passwordInput').value;
    
    closePassword();
    
    fetch(backendUrl + "/changePassword", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                user_id: userId,
                password: password,
                new_password: newPassword
            }),
        })
        .then(response => response.json())
        .then(data => {
            if (!data.SUCCESS) {
                showError(data.error)
            } else {
                localStorage.setItem("password", data.new_password);
                document.getElementById('passwordInput').value = '';
                
            }
        });
}

function changeUserId() {
    let userId = localStorage.getItem("user_id");
    let password = localStorage.getItem("password");
    // Retrieve values from HTML elements
    let newUserId = document.getElementById('userIdInput').value;
    
    closeChangeUserIdPopup();
    fetch(backendUrl + "/changeUserId", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                user_id: userId,
                password: password,
                new_user_id: newUserId
            }),
        })
        .then(response => response.json())
        .then(data => {
            if (!data.SUCCESS) {
                showError(data.error)
            } else {
                localStorage.setItem("user_id", data.new_user_id);
                document.getElementById('userIdInput').value = '';
                
            }
        });
}

function openChangeUserIdPopup() {
    document.getElementById('userIdPopupContainer').style.display = 'block';
}

function closeChangeUserIdPopup() {
    document.getElementById('userIdPopupContainer').style.display = 'none';
}

// other are you sure popup
function openPassword() {
    document.getElementById('passwordPopupContainer').style.display = 'block';
}

function closePassword() {
    document.getElementById('passwordPopupContainer').style.display = 'none';
}

// functions for read messages

function updateUnreadChats() {
    let userId = localStorage.getItem("user_id");
    let password = localStorage.getItem("password");
    
    fetch(backendUrl + "/getUnreadChats", {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            user_id: userId,
            password: password
        }),
    })
    .then(response => response.json())
    .then(data => {
        if (!data.SUCCESS) {
            showError(data.error);
        } else {
            // Clear any existing 'visible' classes
            document.querySelectorAll('.chat-button.visible').forEach(button => {
                button.classList.remove('visible');
            });

            // Add 'visible' class to buttons with unread chat IDs
            data.unread_chats.forEach(chatId => {
                let chatButton = document.getElementById(chatId);
                if (chatButton) {
                    if (chatId != sessionStorage.getItem("chat_id")) {
                        chatButton.classList.add('visible');
                    }
                }
            });
        }
    });
}





function logOut() {
    localStorage.removeItem("user_id")
    localStorage.removeItem("password")
    localStorage.removeItem("username")
    sessionStorage.removeItem("chat_id")
    
    window.location.href = "/login";
}

function openGameParrot(gameId, game) {
    let userId = localStorage.getItem("user_id")
    let chatId = sessionStorage.getItem("chat_id")
    let password = localStorage.getItem("password")
    let isJoining = false
    let access
    let message = "GameParrot(information, "+gameId+", "+userId+")"
    document.getElementById('gameParrotContainer').style.display = 'block';

    fetch(backendUrl + "/sendMessage", {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            user_id: userId,
            password: password,
            chat_id: chatId,
            message: message
        }),
    })
    .then(response => response.json())
    .then(data => {
        console.log(data)
        if (!data.SUCCESS) {
            showError(data.error)
        } else {
            if (data.info.inGame || data.info.gameFull) {
                document.getElementById('joinGameParrot').style.display = "none";
                access = true
            } else {
                document.getElementById('joinGameParrot').style.display = "block";
                document.getElementById('joinGameParrot').setAttribute("data-gameid", gameId)
                document.getElementById('joinGameParrot').setAttribute("data-game", game)
                access = false
            }
            if (!data.info.inGame) {
                access = false
            }
            document.getElementById('gameParrot').src = `./gameparrot/index.html?game_id=${encodeURIComponent(gameId)}&game=${encodeURIComponent(game)}&user_id=${encodeURIComponent(userId)}&chat_id=${encodeURIComponent(chatId)}&password=${encodeURIComponent(password)}&join=${encodeURIComponent(isJoining)}&access=${encodeURIComponent(access)}`;
        }
    });

    
}

function joinGameParrot(gameId, game) {
    userId = localStorage.getItem("user_id")
    chatId = sessionStorage.getItem("chat_id")
    password = localStorage.getItem("password")
    isJoining = true
    access = true

    document.getElementById('gameParrot').src = `./gameparrot/index.html?game_id=${encodeURIComponent(gameId)}&game=${encodeURIComponent(game)}&user_id=${encodeURIComponent(userId)}&chat_id=${encodeURIComponent(chatId)}&password=${encodeURIComponent(password)}&join=${encodeURIComponent(isJoining)}&access=${encodeURIComponent(access)}`;
}

function closeGameParrot() {
    document.getElementById('gameParrotContainer').style.display = 'none';
}

// document.getElementById('gameParrotContainer').style.display = 'block';
// document.getElementById('gameParrotContainer').style.display = 'none';