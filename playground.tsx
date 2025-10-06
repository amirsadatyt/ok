

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
/* tslint:disable */
import {html, LitElement} from 'lit';
import {customElement, query, state} from 'lit/decorators.js';
// tslint:disable-next-line:ban-malformed-import-paths
import hljs from 'highlight.js';
import {classMap} from 'lit/directives/class-map.js';
import {Marked} from 'marked';
import {markedHighlight} from 'marked-highlight';

/** Markdown formatting function with syntax hilighting */
export const marked = new Marked(
  markedHighlight({
    async: true,
    emptyLangClass: 'hljs',
    langPrefix: 'hljs language-',
    highlight(code, lang, info) {
      const language = hljs.getLanguage(lang) ? lang : 'plaintext';
      return hljs.highlight(code, {language}).value;
    },
  }),
);

const ICON_BUSY = html`<svg
  class="rotating"
  xmlns="http://www.w3.org/2000/svg"
  height="24px"
  viewBox="0 -960 960 960"
  width="24px"
  fill="currentColor">
  <path
    d="M480-80q-82 0-155-31.5t-127.5-86Q143-252 111.5-325T80-480q0-83 31.5-155.5t86-127Q252-817 325-848.5T480-880q17 0 28.5 11.5T520-840q0 17-11.5 28.5T480-800q-133 0-226.5 93.5T160-480q0 133 93.5 226.5T480-160q133 0 226.5-93.5T800-480q0-17 11.5-28.5T840-520q17 0 28.5 11.5T880-480q0 82-31.5 155t-86 127.5q-54.5 54.5-127 86T480-80Z" />
</svg>`;
const ICON_EDIT = html`<svg
  xmlns="http://www.w3.org/2000/svg"
  height="16px"
  viewBox="0 -960 960 960"
  width="16px"
  fill="currentColor">
  <path
    d="M120-120v-170l528-527q12-11 26.5-17t30.5-6q16 0 31 6t26 18l55 56q12 11 17.5-26t5.5-30q0-16-5.5-30.5T817-647L290-120H120Zm584-528 56-56-56-56-56 56 56 56Z" />
</svg>`;
const ICON_DESKTOP = html`<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="M120-120v-560h720v560H120Zm80-80h560v-400H200v400Zm0-400v400-400Z"/></svg>`;
const ICON_MOBILE = html`<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="M320-120v-80h320v80H320Zm-80 120q-33 0-56.5-23.5T160-80v-720q0-33 23.5-56.5T240-880h480q33 0 56.5 23.5T800-800v720q0 33-23.5 56.5T720-0H240Zm80-120h320v-560H320v560Z"/></svg>`;
const ICON_ATTACH = html`<svg
  xmlns="http://www.w3.org/2000/svg"
  height="24px"
  viewBox="0 -960 960 960"
  width="24px"
  fill="currentColor"
>
  <path transform="translate(-230 0)" d="M710-144q-117.5 0-199.25-81.75T429-425v-319q0-82.5 58.75-141.25T629-944q82.5 0 141.25 58.75T829-744v288q0-58.5-40.75-99.25T689-596q-58.5 0-99.25 40.75T549-456v264h60v-264q0-33.5 22.75-56.25T689-504q33.5 0 56.25 22.75T769-425v-288q0-57.5-39.75-97.25T630-850q-57.5 0-97.25 39.75T493-713v319q0 91.5 64.25 156.25T710-178q91.5 0 156.25-64.75T931-400v-350h60v350q0 117-81.5 198.5T710-144Z" />
</svg>`;

/**
 * Chat state enum to manage the current state of the chat interface.
 */
export enum ChatState {
  IDLE,
  GENERATING,
  THINKING,
  CODING,
}

/**
 * Chat tab enum to manage the current selected tab in the chat interface.
 */
enum ChatTab {
  GEMINI,
  CODE,
}

/**
 * Preview mode enum to manage the current preview mode.
 */
enum PreviewMode {
  DESKTOP,
  MOBILE,
}

/**
 * Chat role enum to manage the current role of the message.
 */
export enum ChatRole {
  USER,
  ASSISTANT,
  SYSTEM,
}

/**
 * Playground component.
 */
@customElement('gdm-playground')
export class Playground extends LitElement {
  @query('#anchor') anchor;
  @query('#preview-frame') previewFrame: HTMLIFrameElement;
  @query('#fileInput') fileInput: HTMLInputElement;
  private readonly codeSyntax = document.createElement('div');

  @state() chatState = ChatState.IDLE;
  @state() selectedChatTab = ChatTab.GEMINI;
  @state() previewMode = PreviewMode.DESKTOP;
  @state() inputMessage = '';
  @state() code = '';
  @state() messages: HTMLElement[] = [];
  @state() codeHasChanged = false;
  @state() attachedFile: {name: string; type: string; data: string} | null =
    null;

  sendMessageHandler?: (
    input: string,
    role: string,
    code: string,
    codeHasChanged: boolean,
    file: {name: string; type: string; data: string} | null,
  ) => Promise<void>;
  resetHandler?: CallableFunction;

  constructor() {
    super();
    this.codeSyntax.classList.add('code-syntax');
  }

  /** Disable shadow DOM */
  createRenderRoot() {
    return this;
  }

  private updatePreview() {
    if (this.previewFrame) {
      this.previewFrame.srcdoc = this.code;
    }
  }

  updated(changedProperties: Map<string, unknown>) {
    if (changedProperties.has('code')) {
      this.updatePreview();
    }
  }

  async setCode(code: string) {
    this.code = code;
    this.codeSyntax.innerHTML = await marked.parse(
      '```html\n' + code + '\n```',
    );
  }

  setChatState(state: ChatState) {
    this.chatState = state;
  }

  setInputField(message: string) {
    this.inputMessage = message.trim();
  }

  addMessage(role: string, message: string) {
    const div = document.createElement('div');
    div.classList.add('turn');
    div.classList.add(`role-${role.trim()}`);

    const thinkingDetails = document.createElement('details');
    thinkingDetails.classList.add('hidden');
    const summary = document.createElement('summary');
    summary.textContent = 'Thinking...';
    thinkingDetails.classList.add('thinking');
    thinkingDetails.setAttribute('open', 'true');
    const thinking = document.createElement('div');
    thinkingDetails.append(thinking);
    div.append(thinkingDetails);
    const text = document.createElement('div');
    text.className = 'text';
    text.textContent = message;
    div.append(text);

    // FIX: Update messages array immutably to trigger Lit's reactivity, and remove explicit requestUpdate call.
    this.messages = [...this.messages, div];

    this.scrollToTheEnd();

    return {thinking, text};
  }

  scrollToTheEnd() {
    if (!this.anchor) return;
    this.anchor.scrollIntoView({
      behavior: 'smooth',
      block: 'end',
    });
  }

  async sendMessageAction(message?: string, role?: string) {
    if (this.chatState !== ChatState.IDLE) return;

    this.chatState = ChatState.GENERATING;

    let msg = '';
    if (message) {
      msg = message.trim();
    } else {
      // get message and empty the field
      msg = this.inputMessage.trim();
      this.inputMessage = '';
    }

    if (msg.length === 0 && !this.attachedFile) {
      this.chatState = ChatState.IDLE;
      return;
    }

    const msgRole = role ? role.toLowerCase() : 'user';

    if (msgRole === 'user' && msg) {
      this.addMessage(msgRole, msg);
    }

    if (this.sendMessageHandler) {
      await this.sendMessageHandler(
        msg,
        msgRole,
        this.code,
        this.codeHasChanged,
        this.attachedFile,
      );
      this.codeHasChanged = false;
      this.attachedFile = null;
    }

    this.chatState = ChatState.IDLE;
  }

  private async clearAction() {
    this.setCode('');
    this.messages = [];
    this.codeHasChanged = true;
    this.attachedFile = null;
    if (this.resetHandler) {
      this.resetHandler();
    }
  }

  private async codeEditedAction(code: string) {
    if (this.chatState !== ChatState.IDLE) return;

    this.code = code;
    this.codeHasChanged = true;

    this.codeSyntax.innerHTML = await marked.parse(
      '```html\n' + code + '\n```',
    );
  }

  private async inputKeyDownAction(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      e.stopPropagation();
      this.sendMessageAction();
    }
  }

  private async handleFileChange(e: Event) {
    const input = e.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64Data = (event.target?.result as string).split(',')[1];
        this.attachedFile = {
          name: file.name,
          type: file.type,
          data: base64Data,
        };
      };
      reader.readAsDataURL(file);
    }
  }

  render() {
    return html`<div class="playground">
      <div class="sidebar">
        <div class="selector">
          <button
            id="geminiTab"
            class=${classMap({
              'selected-tab': this.selectedChatTab === ChatTab.GEMINI,
            })}
            @click=${() => {
              this.selectedChatTab = ChatTab.GEMINI;
            }}>
            Gemini
          </button>
          <button
            id="codeTab"
            class=${classMap({
              'selected-tab': this.selectedChatTab === ChatTab.CODE,
            })}
            @click=${() => {
              this.selectedChatTab = ChatTab.CODE;
            }}>
            Code ${this.codeHasChanged ? ICON_EDIT : html``}
          </button>
          <button
            id="clear"
            @click=${() => {
              this.clearAction();
            }}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              height="24px"
              viewBox="0 -960 960 960"
              width="24px"
              fill="currentColor">
              <path
                d="m376-300 104-104 104 104 56-56-104-104 104-104-56-56-104 104-104-104-56 56 104 104-104 104 56 56Zm-96 180q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Z" />
            </svg>
            Reset
          </button>
        </div>
        <div
          id="chat"
          class=${classMap({
            'tabcontent': true,
            'showtab': this.selectedChatTab === ChatTab.GEMINI,
          })}>
          <div class="chat-messages">
            ${this.messages}
            <div id="anchor"></div>
          </div>

          <div class="footer">
            <div
              id="chatStatus"
              class=${classMap({'hidden': this.chatState === ChatState.IDLE})}>
              ${this.chatState === ChatState.GENERATING
                ? html`${ICON_BUSY} Generating...`
                : html``}
              ${this.chatState === ChatState.THINKING
                ? html`${ICON_BUSY} Thinking...`
                : html``}
              ${this.chatState === ChatState.CODING
                ? html`${ICON_BUSY} Coding...`
                : html``}
            </div>
            <div id="inputArea">
              <div
                id="fileAttachmentDisplay"
                class=${classMap({'hidden': !this.attachedFile})}>
                ${this.attachedFile
                  ? html`
                      <span>${this.attachedFile.name}</span>
                      <button
                        class="remove-file"
                        @click=${() => {
                          this.attachedFile = null;
                        }}>
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          height="18px"
                          viewBox="0 -960 960 960"
                          width="18px"
                          fill="currentColor">
                          <path
                            d="m256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z" />
                        </svg>
                      </button>
                    `
                  : ''}
              </div>
              <div class="input-row">
                <button
                  id="attachButton"
                  title="Attach file"
                  @click=${() => this.fileInput.click()}>
                  Attach file
                </button>
                <input
                  type="file"
                  id="fileInput"
                  class="hidden"
                  @change=${this.handleFileChange}
                  accept="image/png, image/jpeg, image/webp, image/heic, image/heif" />
                <input
                  type="text"
                  id="messageInput"
                  .value=${this.inputMessage}
                  @input=${(e: InputEvent) => {
                    this.inputMessage = (e.target as HTMLInputElement).value;
                  }}
                  @keydown=${(e: KeyboardEvent) => {
                    this.inputKeyDownAction(e);
                  }}
                  placeholder="Type your message..."
                  autocomplete="off" />
                <button
                  id="sendButton"
                  class=${classMap({
                    'disabled': this.chatState !== ChatState.IDLE,
                  })}
                  @click=${() => {
                    this.sendMessageAction();
                  }}>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    height="30px"
                    viewBox="0 -960 960 960"
                    width="30px"
                    fill="currentColor">
                    <path
                      d="M120-160v-240l320-80-320-80v-240l760 320-760 320Z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
        <div
          id="editor"
          class=${classMap({
            'tabcontent': true,
            'showtab': this.selectedChatTab === ChatTab.CODE,
          })}>
          <div class="code-container">
            ${this.codeSyntax}
            <textarea
              class="code-editor"
              contenteditable=""
              .value=${this.code}
              .readonly=${this.chatState !== ChatState.IDLE}
              @keyup=${(e: KeyboardEvent) => {
                const val = (e.target as HTMLTextAreaElement).value;
                if (this.code !== val) {
                  this.codeEditedAction(val);
                  // FIX: Remove explicit requestUpdate as updating a @state property already triggers it.
                }
              }}
              @change=${(e: InputEvent) => {
                this.codeEditedAction((e.target as HTMLTextAreaElement).value);
              }}></textarea>
          </div>
        </div>
      </div>
      <div
        class="preview-container ${classMap({
          'mobile-view': this.previewMode === PreviewMode.MOBILE,
        })}">
        <div class="preview-toolbar">
          <button
            class=${classMap({
              active: this.previewMode === PreviewMode.DESKTOP,
            })}
            @click=${() => {
              this.previewMode = PreviewMode.DESKTOP;
            }}>
            ${ICON_DESKTOP} Desktop
          </button>
          <button
            class=${classMap({
              active: this.previewMode === PreviewMode.MOBILE,
            })}
            @click=${() => {
              this.previewMode = PreviewMode.MOBILE;
            }}>
            ${ICON_MOBILE} Mobile
          </button>
        </div>
        <div class="preview-frame-container">
          <iframe
            id="preview-frame"
            sandbox="allow-scripts allow-same-origin"></iframe>
        </div>
      </div>
    </div>`;
  }
}