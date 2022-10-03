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
    }

    connect(chatURL){
        console.log('url : ',chatURL)
        const path=`ws://127.0.0.1:8000/ws/chat/${chatURL}/`;
    
        this.socketRef=new WebSocket(path);

        this.socketRef.addEventListener('message', (event) => {
        console.log('Message from server ', event);
         });
         
        this.socketRef.onopen = ()=>{
            console.log("Wensocket is open")
        };
        this.socketNewMessage(JSON.stringify({
            command:'messages'
        }))
        this.socketRef.onmessage=(e)=>{
            this.socketNewMessage(e.data)
            console.log('Message from server ', e.data);
        }
        this.socketRef.onerror=(e)=>{
            console.log(e.message);
        }
        this.socketRef.onclose=()=>{
            console.log("websocket closed ");
            this.connect();
        }
    }
    socketNewMessage(data){
        const parsedData=JSON.parse(data)
        const command=parsedData.command

        if(Object.keys(this.callbacks).length === 0){
            return;
        }
        if(command === 'messages'){
            this.callbacks[command]([parsedData.messages,parsedData.participants,parsedData.name,parsedData.admins,parsedData.system_message])
        }
        if(command === 'new_message'){
            this.callbacks[command](parsedData.message)
    }
}
    fetchMessages(username,chatId){
        this.sendMessage({ command:"load_messages",username:username,chatId:chatId})
    }
    newChatMessage(message){
        this.sendMessage({ command:"new_message",from:message.from , message:message.content , chatId:message.chatId})
    }
    addCallbacks(messageCallback,newMessageCallback){
        this.callbacks['messages']=messageCallback
        this.callbacks['new_message']=newMessageCallback

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
