// --- State Management ---
        const state = {
            history: [],
            isListening: false,
            isLoading: false,
            attachedFile: null,
            isSidebarOpen: true
        };

        // --- Elements ---
        const chatContainer = document.getElementById('chat-history');
        const inputField = document.getElementById('user-input');
        const sendBtn = document.getElementById('send-btn');
        const voiceBtn = document.getElementById('voice-btn');
        const fileInput = document.getElementById('file-input');
        const filePreview = document.getElementById('file-preview');
        const fileNameDisplay = document.getElementById('file-name');
        const removeFileBtn = document.getElementById('remove-file-btn');
        const loadingIndicator = document.getElementById('loading-indicator');
        const quickCmds = document.querySelectorAll('.quick-cmd');
        const menuToggle = document.getElementById('menu-toggle');
        const sidebar = document.getElementById('sidebar');
        const closeSidebarBtn = document.getElementById('close-sidebar-btn');

        // --- Init Icons ---
        lucide.createIcons();

        // --- API Logic ---
        const generateContent = async (prompt, history = [], fileContent = null) => {
            const apiKey = ""; // Provided by environment
            const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;

            let messages = history.map(msg => ({
                role: msg.role === 'user' ? 'user' : 'model',
                parts: [{ text: msg.content }]
            }));

            let currentPrompt = prompt;
            if (fileContent) {
                currentPrompt = `${prompt}\n\n[Context from attached file]:\n${fileContent}`;
            }

            messages.push({
                role: 'user',
                parts: [{ text: currentPrompt }]
            });

            const payload = {
                contents: messages,
                systemInstruction: {
                    parts: [{ text: `You are 'NEXUS CORE AI', a highly advanced Personal AI Assistant built by the Skyline Studio team. You act as a capable, technical, and efficient terminal-based assistant. You can generate code, answer questions, and summarize files. If the user asks to 'open' a website (like google, youtube, github), respond with a special JSON block at the START of your message: \`\`\`json\n{"action": "open", "url": "https://..."}\n\`\`\` followed by a verbal confirmation. If asked to write code, use markdown code blocks. Be cool, futuristic, and helpful.` }]
                }
            };

            try {
                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                
                if (!response.ok) throw new Error('API Error');

                const data = await response.json();
                return data.candidates?.[0]?.content?.parts?.[0]?.text || "System Error: No response.";
            } catch (error) {
                console.error(error);
                return "Error: Connection to Neural Core failed.";
            }
        };

        // --- Render Logic ---
        function appendMessage(role, content) {
            const msgRow = document.createElement('div');
            msgRow.className = `flex w-full ${role === 'user' ? 'justify-end' : 'justify-start'}`;
            
            // Markdown parsing
            let htmlContent = role === 'model' ? marked.parse(content) : content.replace(/\n/g, '<br>');

            // Styles for bubbles
            const userBubble = `bg-[#1a1a1a] border border-white/10 text-gray-200 rounded-2xl rounded-tr-sm`;
            const modelBubble = `bg-transparent text-gray-300 pl-0`; // Minimalist for AI to look like terminal output
            
            const containerClass = role === 'user' ? userBubble : modelBubble;
            const maxWidth = role === 'user' ? 'max-w-[80%]' : 'max-w-[95%]';
            
            // Icon
            const icon = role === 'user' 
                ? '' 
                : `<div class="mt-1 mr-3 text-indigo-500 shrink-0"><i data-lucide="zap" class="w-5 h-5"></i></div>`;

            msgRow.innerHTML = `
                <div class="flex ${maxWidth} group animate-in fade-in slide-in-from-bottom-2 duration-300">
                    ${role === 'model' ? icon : ''}
                    <div class="${containerClass} px-5 py-3 shadow-sm relative markdown-content overflow-hidden">
                        ${htmlContent}
                    </div>
                </div>
            `;
            
            chatContainer.appendChild(msgRow);
            
            // Re-init icons for the new message
            lucide.createIcons();
            
            chatContainer.scrollTo({ top: chatContainer.scrollHeight, behavior: 'smooth' });
            
            // Add to history state
            if(role !== 'system') {
                state.history.push({ role, content });
            }
        }

        function appendSystemMessage(text) {
             const msgDiv = document.createElement('div');
             msgDiv.className = 'flex justify-center';
             msgDiv.innerHTML = `
                <div class="text-gray-500 text-[10px] font-bold uppercase tracking-wider bg-white/5 px-3 py-1 rounded-full my-2 border border-white/5">
                    ${text}
                </div>
             `;
             chatContainer.appendChild(msgDiv);
             chatContainer.scrollTo({ top: chatContainer.scrollHeight, behavior: 'smooth' });
        }

        // --- Interaction Logic ---
        async function handleSend(textOverride = null) {
            const text = textOverride || inputField.value;
            if (!text.trim() && !state.attachedFile) return;

            // Clear inputs
            inputField.value = '';
            inputField.style.height = 'auto'; // Reset height
            
            // Display User Message
            appendMessage('user', text);
            
            // Loading State
            state.isLoading = true;
            loadingIndicator.classList.remove('hidden');

            // API Call
            const responseText = await generateContent(
                text || "Summarize this file.",
                state.history,
                state.attachedFile?.content
            );

            // Clear File
            state.attachedFile = null;
            filePreview.classList.add('hidden');
            fileInput.value = '';

            // Handle Actions (JSON)
            let cleanResponse = responseText;
            const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/);
            
            if (jsonMatch) {
                try {
                    const actionData = JSON.parse(jsonMatch[1]);
                    if (actionData.action === 'open' && actionData.url) {
                        window.open(actionData.url, '_blank');
                        appendSystemMessage(`Executing: Opening ${actionData.url}`);
                    }
                    cleanResponse = responseText.replace(jsonMatch[0], '').trim();
                } catch (e) {
                    console.error("Action parse error", e);
                }
            }

            // Display AI Response
            loadingIndicator.classList.add('hidden');
            state.isLoading = false;
            appendMessage('model', cleanResponse);
        }

        // --- Sidebar Logic ---
        function toggleSidebar() {
            state.isSidebarOpen = !state.isSidebarOpen;
            if (state.isSidebarOpen) {
                sidebar.classList.remove('w-0', 'border-none');
                sidebar.classList.add('w-72', 'border-l');
            } else {
                sidebar.classList.remove('w-72', 'border-l');
                sidebar.classList.add('w-0', 'border-none');
            }
        }

        // --- Event Listeners ---
        menuToggle.addEventListener('click', toggleSidebar);
        closeSidebarBtn.addEventListener('click', toggleSidebar);

        sendBtn.addEventListener('click', () => handleSend());
        
        inputField.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
            }
        });

        // Auto-resize textarea
        inputField.addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = (this.scrollHeight) + 'px';
        });

        // Quick Commands
        quickCmds.forEach(cmd => {
            cmd.addEventListener('click', () => {
                inputField.value = cmd.dataset.cmd;
                inputField.focus();
            });
        });

        // File Upload
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (event) => {
                state.attachedFile = { name: file.name, content: event.target.result };
                fileNameDisplay.textContent = file.name;
                filePreview.classList.remove('hidden');
                appendSystemMessage(`File attached: ${file.name}`);
            };
            reader.readAsText(file);
        });

        removeFileBtn.addEventListener('click', () => {
            state.attachedFile = null;
            filePreview.classList.add('hidden');
            fileInput.value = '';
        });

        // Voice Recognition
        voiceBtn.addEventListener('click', () => {
            if (state.isListening) {
                state.isListening = false;
                voiceBtn.classList.remove('text-red-500', 'bg-red-500/10');
                inputField.placeholder = "Ask your Personal AI...";
                return;
            }

            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            if (!SpeechRecognition) {
                appendSystemMessage("Error: Voice modules not detected.");
                return;
            }

            const recognition = new SpeechRecognition();
            recognition.continuous = false;
            recognition.lang = 'en-US';
            recognition.interimResults = false;

            recognition.onstart = () => {
                state.isListening = true;
                voiceBtn.classList.add('text-red-500', 'bg-red-500/10');
                inputField.placeholder = "Listening...";
            };

            recognition.onend = () => {
                state.isListening = false;
                voiceBtn.classList.remove('text-red-500', 'bg-red-500/10');
                inputField.placeholder = "Ask your Personal AI...";
            };

            recognition.onresult = (event) => {
                const transcript = event.results[0][0].transcript;
                inputField.value = transcript;
                handleSend(transcript);
            };

            recognition.start();
        });
