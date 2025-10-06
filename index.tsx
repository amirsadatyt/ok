/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import {GoogleGenAI} from '@google/genai';
import {ChatState, marked, Playground} from './playground';

const SYSTEM_INSTRUCTIONS = `You are Gemini, a helpful and proficient AI assistant. You can help with coding in various languages, answer questions, and assist with a wide range of tasks. When providing code, return it in a formatted code block.`;

const EXAMPLE_PROMPTS = [
  'write a python script to sort a list of tuples by the second element',
  'explain the difference between let, const, and var in javascript',
  'create a simple HTML page with a CSS-animated button',
  'what are the main principles of object-oriented programming?',
];

// FIX: Initialize GoogleGenAI with apiKey from process.env.API_KEY and remove deprecated apiVersion.
const ai = new GoogleGenAI({
  apiKey: process.env.API_KEY,
});

function createAiChat() {
  return ai.chats.create({
    // FIX: Use 'gemini-2.5-flash' model as it supports thinkingConfig.
    model: 'gemini-2.5-pro',
    config: {
      systemInstruction: SYSTEM_INSTRUCTIONS,
      thinkingConfig: {
        includeThoughts: true,
      },
    },
  });
}

let aiChat = createAiChat();

function getCode(text: string): string {
  const match = text.match(/```(?:[a-zA-Z0-9]*)?\n([\s\S]+?)```/);
  if (match && typeof match[1] === 'string') {
    return match[1].trim();
  }
  return '';
}

document.addEventListener('DOMContentLoaded', async (event) => {
  const rootElement = document.querySelector('#root')! as HTMLElement;

  // FIX: Cast to an intersection type `Playground & HTMLElement` to resolve TypeScript's
  // inability to recognize that `Playground` extends `HTMLElement`. This satisfies
  // the type requirements for both appending the element to the DOM and accessing
  // its custom properties.
  const playground = document.createElement('gdm-playground') as Playground & HTMLElement;
  rootElement.appendChild(playground);

  playground.sendMessageHandler = async (
    input: string,
    role: string,
    code: string,
    codeHasChanged: boolean,
    file: {name: string; type: string; data: string} | null,
  ) => {
    console.log(
      'sendMessageHandler',
      input,
      role,
      code,
      'codeHasChanged:',
      codeHasChanged,
      'file:',
      file?.name,
    );

    const {thinking, text} = playground.addMessage('assistant', '');
    
    let messageContent: string | ({text: string} | {inlineData: {mimeType: string, data: string}})[];

    let textInput = input;
    if (role.toUpperCase() === 'USER' && codeHasChanged) {
      textInput =
        'I have updated the code: ```html\n' +
        code +
        '\n```\n\n' +
        input;
    }
    
    if (file) {
      const parts = [];
      parts.push({
          inlineData: {
              mimeType: file.type,
              data: file.data
          }
      });
      parts.push({ text: textInput });
      messageContent = parts;
    } else {
      messageContent = textInput;
    }

    playground.setChatState(ChatState.GENERATING);

    text.innerHTML = '...';

    let newCode = '';
    let thought = '';

    try {
      // FIX: Pass a single message string or a multipart message to sendMessageStream.
      const res = await aiChat.sendMessageStream({message: messageContent});

      for await (const chunk of res) {
        for (const candidate of chunk.candidates ?? []) {
          for (const part of candidate.content.parts ?? []) {
            if (part.thought) {
              playground.setChatState(ChatState.THINKING);
              thought += part.text;
              thinking.innerHTML = await marked.parse(thought);
              thinking.parentElement.classList.remove('hidden');
            } else if (part.text) {
              playground.setChatState(ChatState.CODING);
              newCode += part.text;
              const extractedCode = getCode(newCode);

              // Remove the code block, it is available in the Code tab
              const explanation = newCode.replace(
                /```(?:[a-zA-Z0-9]*)?\n([\s\S]+?)```/,
                '',
              );

              text.innerHTML = await marked.parse(explanation);
            }
            playground.scrollToTheEnd();
          }
        }
      }
    } catch (e: any) {
      console.error('GenAI SDK Error:', e);
      let message = 'An error occurred. Please try again.';
      if (e.message) {
        message = e.message;
      }
      const {text} = playground.addMessage('error', '');
      text.innerHTML = await marked.parse(message);
    }

    // close thinking block
    thinking.parentElement.removeAttribute('open');

    // If the answer was just code
    if (text.innerHTML.trim().length === 0) {
      text.innerHTML = 'Done';
    }

    const extractedCode = getCode(newCode);
    if (extractedCode.trim().length > 0) {
      playground.setCode(extractedCode);
    }
    playground.setChatState(ChatState.IDLE);
  };

  playground.resetHandler = async () => {
    aiChat = createAiChat();
  };

  playground.addMessage(
    'assistant',
    'Hello! I am Gemini. How can I help you with coding or anything else today?',
  );
  playground.setCode(`<!DOCTYPE html>
<html>
<head>
  <title>Preview</title>
  <style>
    body {
      font-family: sans-serif;
      display: grid;
      place-content: center;
      height: 100vh;
      margin: 0;
      background-color: #f0f0f0;
    }
    h1 {
      color: #333;
    }
  </style>
</head>
<body>
  <h1>Hello, World!</h1>
</body>
</html>`);
  playground.setInputField(
    EXAMPLE_PROMPTS[Math.floor(Math.random() * EXAMPLE_PROMPTS.length)],
  );
});
