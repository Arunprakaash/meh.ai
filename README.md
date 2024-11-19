# meh.ai  
## A Playful Approach to Page Interaction

**meh.ai** is a Chrome extension that empowers users to interact with web pages in a fun and engaging way. Leveraging the power of on-device AI, meh.ai allows you to ask questions about the content of the page, summarize it, and even extract key insights, all within a seamless chat-like interface. This project was developed for the Google Chrome Built-in AI Challenge Hackathon hosted by Devpost.

### Demo & Installation

**Check out a demo here:** [https://www.youtube.com/watch?v=sB2bhBTzYPM](https://www.youtube.com/watch?v=sB2bhBTzYPM)

**Install the extension (development version):**

1. Clone this repository.
2. Open Chrome and navigate to `chrome://extensions`.
3. Enable "Developer mode" in the top right corner.
4. Click "Load unpacked" and select the dist directory of this repository.

### Features

- **Content Processing:** Extracts text from web pages and indexes it using a vector database, allowing for efficient search and retrieval.
- **Question Answering:** Ask natural language questions about the page content, and meh.ai will provide relevant answers using Gemini Nano.
- **Source Highlighting:** Meh.ai highlights relevant sections of the page content, offering transparency and context.
- **User-Friendly Interface:** A simple, chat-like interface makes interacting with the content easy and enjoyable. 

### Key Files

- **service_worker.js:** The core backend logic of the extension, handling requests from the frontend, managing the LLM, and interacting with the vector database.
- **index.html:** The main HTML file of the sidepanel, containing the chat interface and user interaction elements.
- **index.js:** The main JavaScript file for the sidepanel, handling user input, communication with the service worker, and updating the interface.
- **extract_content.js:** Responsible for extracting readable text content from web pages using the `Readability` library.
- **text_splitter.js:** Implements text splitting logic to prepare content for the language model.
- **vector_store.js:** Manages the vector database, storing and retrieving embeddings for efficient search.

### Development

#### Prerequisites

To use this project, you will need:

* **Node.js and npm or yarn package manager installed.**

#### Important Notes:

* **Acknowledge Google’s Generative AI Prohibited Uses Policy.**
* **Download Chrome Dev channel (or Canary channel), and confirm that your version is equal or newer than 128.0.6545.0.**
* **Check that your device meets the requirements.**
* **Don’t skip this step, in particular make sure that you have at least 22 GB of free storage space.**
* **If after the download the available storage space falls below 10 GB, the model will be deleted again. Note that some operating systems may report the actual free disk space differently, for example, by including or not disk space that's occupied by the trash bin. On macOS, use Disk Utility to get the representative free disk space.**

### Enable Gemini Nano and Prompt API

Follow these steps to enable Gemini Nano and the Prompt API flags for local experimentation:

1. **Open a new tab in Chrome, go to chrome://flags/#optimization-guide-on-device-model**
2. **Select Enabled BypassPerfRequirement.** This bypasses performance checks which might prevent Gemini Nano from being downloaded on your device.
3. **Go to chrome://flags/#prompt-api-for-gemini-nano.**
4. **Select Enabled.**
5. **Relaunch Chrome.**

### Confirm Gemini Nano Availability

1. **Open DevTools and send (await ai.languageModel.capabilities()).available; in the console.**
2. **If this returns "readily", then you are all set.** 

**For more information on how to set up Gemini Nano, see the documentation here:** [https://docs.google.com/document/d/1VG8HIyz361zGduWgNG7R_R8Xkv0OOJ8b5C9QKeCjU0c/edit?tab=t.0#heading=h.p6ot1jmhcd78](https://docs.google.com/document/d/1VG8HIyz361zGduWgNG7R_R8Xkv0OOJ8b5C9QKeCjU0c/edit?tab=t.0#heading=h.p6ot1jmhcd78)

### Development Process

1. **Install Dependencies:** `npm install` or `yarn` 
2. **Build:** `npm run build` or `yarn build` (builds the extension for production)
3. **Load the Extension:** Follow the instructions for installing the development version in the "Installation" section.

### Testing

- Test the extension by interacting with various web pages, asking questions, and observing the responses.
- Utilize your browser's developer tools to debug issues.

**This project is still in development.**

[![meh.ai Video](https://img.youtube.com/vi/sB2bhBTzYPM/0.jpg)](https://www.youtube.com/watch?v=sB2bhBTzYPM "meh.ai Video")
