# Prompt Library

Store prompt templates with {{variables}}, fill them in, and test on Claude or OpenAI.

## Folders
    server.js            entry point, starts the server
    src/routes/run.js    handles the Run button request
    src/providers/       claude.js and openai.js (API calls)
    src/utils/           rate limit, http helpers, static file serving
    public/index.html    page structure
    public/css/          design
    public/js/           storage.js (data) and app.js (screen + clicks)

## Run locally
    node server.js
Open http://localhost:3000, click Settings, paste your API key.

## Deploy on Render
Build command: (empty). Start command: node server.js
