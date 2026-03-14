import { WS_BASE_URL } from './config';

class WebSocketService{

    static instance=null;

    callbacks={}

    static getInstance(){
        if(WebSocketService.instance==null){
            WebSocketService.instance=new WebSocketService
        }
        return WebSocketService.instance
    }
    constructor(){
        this.socketRef=null;
        this.currentChatURL=null;
    }

    connect(chatURL){
        if (chatURL == null || chatURL === '' || String(chatURL) === 'undefined') {
            console.log('websocket: skip connect, invalid chatURL', chatURL);
            return;
        }
        const room = String(chatURL);
        if (this.socketRef && this.socketRef.readyState === WebSocket.OPEN && this.currentChatURL === room) {
            return;
        }
        if (this.socketRef && (this.socketRef.readyState === WebSocket.OPEN || this.socketRef.readyState === WebSocket.CONNECTING)) {
            this.reconnectIntent = true;
            this.socketRef.close();
            this.socketRef = null;
        }
        this.currentChatURL = room;
        this.reconnectIntent = false;
        const path = `${WS_BASE_URL}/ws/chat/${this.currentChatURL}/`;
        console.log('url : ', path);

        this.socketRef = new WebSocket(path);

        this.socketRef.addEventListener('message', (event) => {
            console.log('Message from server ', event);
        });

        this.socketRef.onopen = () => {
            this.reconnectAttempts = 0;
            console.log("Websocket is open");
        };
        this.socketRef.onmessage = (e) => {
            this.socketNewMessage(e.data);
            try { console.log('Message from server json : ', JSON.parse(e.data).command); } catch (_) {}
        };
        this.socketRef.onerror = (e) => {
            console.log('WebSocket error', e.message || e);
        };
        this.socketRef.onclose = () => {
            console.log("websocket closed");
            const url = this.currentChatURL;
            this.socketRef = null;
            if (url && !this.reconnectIntent) {
                const delay = Math.min(2000 + (this.reconnectAttempts || 0) * 1000, 10000);
                this.reconnectAttempts = (this.reconnectAttempts || 0) + 1;
                setTimeout(() => {
                    this.reconnectAttempts = 0;
                    this.connect(url);
                }, delay);
            }
        };
    }
    socketNewMessage(data){
        const parsedData=JSON.parse(data)
        const command=parsedData.command
        console.log("command :=> " , command)
        if(Object.keys(this.callbacks).length === 0){
            return;
        }
        if(command === 'messages'){
            this.callbacks[command]([parsedData.messages,parsedData.participants,parsedData.name,parsedData.admins,parsedData.system_message,parsedData.image,parsedData.chatKey])
        }
        if(command === 'new_message'){
            this.callbacks[command](parsedData.message)
        }
        if(command === 'chatsUpdate'){
            console.log('chatUpdates',localStorage.getItem("username"),localStorage.getItem("token"))
            this.callbacks[command](localStorage.getItem("username"),localStorage.getItem("token"))
        }
}
    fetchMessages(username,chatId,msgCount=10){
        this.sendMessage({ command:"load_messages",username:username,chatId:chatId,msgCount:msgCount})
    }
    newChatMessage(message){
        this.sendMessage({ command:"new_message",from:message.from , message:message.content , chatId:message.chatId})
    }
    addCallbacks(messageCallback,newMessageCallback,updateChats){
        this.callbacks['messages']=messageCallback
        this.callbacks['new_message']=newMessageCallback
        this.callbacks['chatsUpdate']=updateChats
    }
    sendMessage(data){
        try{
            console.log('at socket data ',data)
            this.socketRef.send(JSON.stringify({...data}))
        }catch(e){
            console.log(e.message)
        }
    }

    state(){
        if(this.socketRef)
            return this.socketRef.readyState;
        else
            return null
    }
}

const webSocketInstance = WebSocketService.getInstance();

export default webSocketInstance;


//import { SOCKET_URL } from "./settings";

// class WebSocketService {
//   static instance = null;
//   callbacks = {};

//   static getInstance() {
//     if (!WebSocketService.instance) {
//       WebSocketService.instance = new WebSocketService();
//     }
//     return WebSocketService.instance;
//   }

//   constructor() {
//     this.socketRef = null;
//   }

//   connect(chatUrl) {
//     const path="ws://127.0.0.1:8000/ws/chat/test/"
//     this.socketRef = new WebSocket(path);
//     this.socketRef.onopen = () => {
//       console.log("WebSocket open");
//     };
//     this.socketRef.onmessage = e => {
//       this.socketNewMessage(e.data);
//     };
//     this.socketRef.onerror = e => {
//       console.log(e.message);
//     };
//     this.socketRef.onclose = () => {
//       console.log("WebSocket closed let's reopen");
//       this.connect();
//     };
//   }

//   disconnect() {
//     this.socketRef.close();
//   }

//   socketNewMessage(data) {
//     const parsedData = JSON.parse(data);
//     const command = parsedData.command;
//     if (Object.keys(this.callbacks).length === 0) {
//       return;
//     }
//     if (command === "messages") {
//       this.callbacks[command](parsedData.messages);
//     }
//     if (command === "new_message") {
//       this.callbacks[command](parsedData.message);
//     }
//   }

//   fetchMessages(username) {
//     this.sendMessage({
//       command: "load_messages",
//       username: username,
//     });
//   }

//   newChatMessage(message) {
//     this.sendMessage({
//       command: "new_message",
//       from: message.from,
//       message: message.content,
//     });
//   }

//   addCallbacks(messagesCallback, newMessageCallback) {
//     this.callbacks["messages"] = messagesCallback;
//     this.callbacks["new_message"] = newMessageCallback;
//   }

//   sendMessage(data) {
//     try {
//       this.socketRef.send(JSON.stringify({ ...data }));
//     } catch (err) {
//       console.log(err.message);
//     }
//   }

//   state() {
//     return this.socketRef.readyState;
//   }
// }

// const WebSocketInstance = WebSocketService.getInstance();

// export default WebSocketInstance;
