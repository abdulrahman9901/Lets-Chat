import React from 'react';
import {message, Upload} from 'antd'
import Sidepanel from './sidepanel';
import webSocketInstance from '../websocket';
import Login from './Login';
import AddChatModal from './Popup';
import {connect} from 'react-redux'
import { Button } from 'antd';
import axios from 'axios';
import AddMemberModal from './MemeberPopup'
import * as navActions from '../store/actions/nav'
import * as messageActions from '../store/actions/messages'
import JoinChatModal from './joinPopup';
import 'url-change-event'
import UploadModal from './UploadPopup';
import { Dropdown, Menu } from 'antd';

class Chat extends React.Component {

    state={
        message:'',
        upload:false,
        messageLoad:false,
        msgCount:50,
    }

    initializeChat(){
        console.log('==============> initializeChat <=============')
        this.setState({ 
            msgCount: 50 ,
            messageLoad:false
        },function () {
            console.log("new msgCount ",this.state.msgCount)
        })
        const chatId =window.location.pathname.slice(1);
        console.log('==============>match',chatId)
        if(chatId!='' && Number.isInteger(parseInt(chatId))){
        this.waitForSocketConnection(()=>{
            webSocketInstance.fetchMessages(this.props.currentUser,chatId,50);
        });
            webSocketInstance.connect(chatId);
        }
    }
    pathname = null;
    constructor(props){
        super(props)
        console.log('constructor')
        this.initializeChat()
        const CheckUrlChange = () => {
            console.log('in event handler ',location.pathname ,this.pathname)
            if (location.pathname !== this.pathname) {
                console.log(this.pathname,location.pathname)
                this.pathname = location.pathname;
                    this.initializeChat()
            }
        }
        // https://stackoverflow.com/a/68371679
        window.addEventListener("click",CheckUrlChange);

        // window.addEventListener('urlchangeevent',CheckUrlChange);
        // var pushState = window.history.pushState;
        // window.history.pushState = function(state) {
        //     this.initializeChat()
        //     console.log('I am called from pushStateHook');
        //     return pushState.apply(history, arguments);
        // };
        
    }

    componentWillReceiveProps(newProps){
        // const loadMoreMsgs = ()=>{
        //     this.setState((prevState) => ({ 
        //         msgCount: prevState.msgCount + 10 ,
        //         messageLoad:true
        //      }),function () {
        //         console.log("new msgCount =======>>>>>>",this.state)
        //         webSocketInstance.fetchMessages(this.props.currentUser,window.location.pathname.slice(1),this.state.msgCount);
        //     })
        //   };
        console.log('newProps',newProps.messages,'Props',this.props.messages)
        console.log('componentWillReceiveProps')
        this.props.getChats()
        if (newProps && newProps.messages){
            if (newProps.messages.length == 1 && newProps.messages[0].system_message)
                this.pathname = location.pathname;
        }
    // try {
    //     document.getElementById("messagesWindow").addEventListener("scroll",function() {
    //         console.log(document.getElementById("messagesWindow").scrollTop); 
    //         if(document.getElementById("messagesWindow").scrollTop >= 100 && document.getElementById("messagesWindow").scrollTop <= 110){
    //             //document.getElementById("messagesWindow").scrollTop = 100
    //             console.log("load more messages !! ")
    //             loadMoreMsgs();
    //         }
    //     })
    //     }catch(error){
    //         console.log(error)
    //     }
    
        // if(this.state.messageLoad === false)
        // {  
             console.log("scroll down did update")
            this.scrollToBottom();
        // }
        // else {
            // this.setState({ 
            //     messageLoad:false
            //  },function () {
            //     console.log("new msgCount ",this.state.messageLoad)
            // })
        //}
    }

    messagesEndRef = React.createRef()
    textareaRef = React.createRef()

    /**https://stackoverflow.com/questions/37620694/how-to-scroll-to-bottom-in-react */
    scrollToBottom = () => {
        this.messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }
      
      componentDidMount() {
        // if(this.state.messageLoad === false)
        // {   console.log("scroll down did mount")
        //     this.scrollToBottom();}
        // else {
        //     this.setState({ 
        //         messageLoad:false
        //      },function () {
        //         console.log("new msgCount ",this.state.messageLoad)
        //     })
        // }
        this.scrollToBottom();
        this.submitOnEnter();
      }
      
      componentDidUpdate() {
        if(this.state.messageLoad === false)
        {   console.log("scroll down did update",this.state)
            this.scrollToBottom();
        }
        else {
            this.setState({ 
                messageLoad:false
             },function () {
                console.log("new msgCount ",this.state.messageLoad)
            })
        }
        this.submitOnEnter();
    }
    timestampDisplay(timestamp){
        let prefix = "";
            const timeDiff = Math.round(
            (new Date().getTime() - new Date(timestamp).getTime()) / 60000);
            let date = new Date(timestamp)
            console.log('timeDiff',timeDiff)
            if (timeDiff < 1) {
            // less than one minute ago
            prefix = "just now...";
            } else if (timeDiff < 60 && timeDiff >= 1) {
            // less than sixty minutes ago
            if (timeDiff < 2)
                prefix = `one min. ago`;
            else
                prefix = `${timeDiff} mins. ago`;
            } else if (timeDiff < 24 * 60 && timeDiff >= 60) {
            // less than 24 hours ago
            if(timeDiff < 2 * 60)
                prefix = `one hour ago`;
            else
                prefix = `${Math.round(timeDiff / 60)} hours ago`;
            } else if (timeDiff < 31 * 24 * 60 && timeDiff >= 24 * 60) {
            // less than 31 days ago
            if(timeDiff < 2 * 24 * 60)
                prefix = `a day ago`;
            else
                prefix = `${Math.round(timeDiff / (60 * 24))} days ago`;
            } else {
            prefix = `${date.getDate()}/${(date.getMonth()+1)}/${date.getFullYear()} at ${date.toLocaleString('en-US', { hour: 'numeric', hour12: true })}`;
            }
            return prefix;
    }

    changeVisibility=(e,timestamp) => {
        console.log(e.target.id)
        var ele=document.getElementById(e.target.id+'s')
        console.log('attr',ele.attributes[2].nodeValue)
        
        if (ele.attributes[2].nodeValue==='visibility: hidden;')
            ele.attributes[2].nodeValue='visibility: visible;'
        else
            ele.attributes[2].nodeValue='visibility: hidden;'
        
        ele.innerText = this.timestampDisplay(timestamp) ;
        console.log(ele.attributes[2].nodeValue)
    }
    renderMessages(messages,participantsCount,participants){
        // const currentUser='admin'
        const currentUser=localStorage.getItem('username')
        /* for unknown reason last message is duplicated so the next line solve this problem 
        https://www.javascripttutorial.net/array/javascript-remove-duplicates-from-array/
        */
        messages = [...new Map(messages.map((m) => [m.id, m])).values()]
        return messages.map(message => {
            if (message.system_message == true){
                return(
                <div key={message.id}>
                <li key={message.id} className="sys"><p className="sys" id="193">{message.content}</p></li>
                </div>
                )                
            }else{
            return(
            <div key={message.id}>
            <li key={message.id}  className={participants.includes(message.author) ? currentUser === message.author ? 'sent' :'replies' : 'replies out'}>
            {participantsCount >= 0 ?
            <small id={message.id+'p'} className={participants.includes(message.author) ? currentUser === message.author ? 'sender' :'reciever' :'out'}>
                    {   
                        message.author
                    }
                </small>
            : null }
                <br />
            
            {/* <img src="http://emilcarlsson.se/assets/mikeross.png" alt="" /> */}
            <img src={`https://img.icons8.com/glyph-neue/128/${participants.includes(message.author)? currentUser === message.author ? '213541' :'8A724E':'808080'}/user-male-circle.png`}/>
                {
                message.content === null ?
                // "image has been uploaded to the chat"
                  <img src={`http://127.0.0.1:8000/media/`.concat(message.image)} onClick={(e) => this.changeVisibility(e,message.timestamp)} id={message.id} className={`messageImage  ${participants.includes(message.author)? currentUser === message.author ? 'imgsent' :'imgrecv' :'imgout'}`} alt="" />
                : <p onClick={(e) => this.changeVisibility(e,message.timestamp)} id={message.id}>{message.content}</p>
                }
             <br/>
                <small id={message.id+'s'} className={currentUser === message.author ? `sent ${message.content === null ? 'imagesent' : null}` :`replies ${message.content === null ? 'imagercv' :null}`} style={{visibility:"hidden"}}>
                    {   
                        this.timestampDisplay(message.timestamp)
                    }
                </small>
            </li>
            </div>
        )}
    })
    }
    waitForSocketConnection(callback){
        const component =this;
        setTimeout(
            function(){
                if(webSocketInstance.state() === 1){
                    console.log('connection is secure !');
                        callback();
                }else {
                    console.log('Waiting for connection.... ')
                    component.waitForSocketConnection(callback);
                }
            }
            ,100)
    }
   
    sendMessageHandler= e =>{
        e.preventDefault();
        if (this.state.message.length && this.state.message.length > 0){
        const messageObject={
            from:localStorage.getItem('username'),
            content:this.state.message,
            chatId :window.location.pathname.slice(1)
        }
        console.log('obj',messageObject);
        webSocketInstance.newChatMessage(messageObject);
        webSocketInstance.fetchMessages(this.props.currentUser,window.location.pathname.slice(1),this.state.msgCount);
        this.setState({
            message:'',
            flag:true
        },function () {
            console.log('state is : ' ,this.state);
        });
    }
    }
    changeMessageHandler= e =>{
        this.setState({
            flag:false,
            message:e.target.value
        },function () {
            console.log('state is : ' ,this.state);
        });
    }
    showModal= e =>{
        this.setState({
            upload:true,
        },function () {
            console.log('state is : ' ,this.state);
        });
    }

    handleCancel = () => {
        this.setState({
            upload:false,
        },function () {
            console.log('state is : ' ,this.state);
        });
      };

    /** https://stackoverflow.com/questions/38093760/how-to-access-a-dom-element-in-react-what-is-the-equilvalent-of-document-getele/38093981#38093981 */

    submitOnEnter= () => {
        
        //if (this.textareaRef.current){
        // Execute a function when the user presses a key on the keyboard
        this.textareaRef.current?.addEventListener("keypress", function(event) {
        // If the user presses the "Enter" key on the keyboard
        if (event.key === "Enter") {
            // Cancel the default action, if needed
            event.preventDefault();
            // Trigger the button element with a click
            document.getElementById("chat-message-submit").click();
        
            }
        }); 
    //}
}
    leave =()=>{
        console.log(this.props.token)
        const chatId =window.location.pathname.slice(1);
        axios.defaults.xsrfHeaderName = "X-CSRFTOKEN";
        axios.defaults.xsrfCookieName = "csrftoken";
        axios.defaults.headers = {
            'Content-Type' : 'application/json',
            Authorization :`Token ${this.props.token}`
        }
        axios.put(`http://127.0.0.1:8000/chat/${chatId}/update/`,
                {
                "name": "new name",
                "messages": [],
                "admins" :[],
                "participants":this.props.participants.filter((p) =>{
                    return p !=localStorage.getItem('username')
                }),
                }
        ).then(res=>{
            console.log(res.data)
            message.success('You have left the chat successfully',5)
            this.props.getChats(localStorage.getItem('username'),this.props.token)
            this.initializeChat();
            // window.history.pushState('', 'Home page', '/');
            window.location.pathname = "/"
            }).catch(err =>{
                console.log(`error at create chat ${err}`)
                message.error('something went wrong olease try again later...! ',5)
            });
        }
    render(){
        console.log('props =>>>>>>>>>>>> ',this.props)
        const messages=this.props.messages;
        console.log('at render chat ', this.props.participants)

        if(this.props.isAuthenticated === true) 
        {console.log("isAuthenticated");
        return (
            <div id="frame">
                 <AddChatModal 
                isVisible={this.props.showAddChatPopup}
                close={() => this.props.closeAddChatPopup()}
                  />
                <AddMemberModal 
                isVisible={this.props.showAddMemeberPopup}
                close={() => this.props.closeAddMemeberPopup()}
                />
                <JoinChatModal 
                isVisible={this.props.showJoinChatPopup}
                close={() => this.props.closeJoinChatPopup()}
                />
                <UploadModal  chatid ={window.location.pathname.slice(1)}  username={this.props.currentUser} token={this.props.token} open={this.state.upload} cancel={this.handleCancel}/>
                <Sidepanel />
                <div className="content">
                {this.props.participants && this.props.participants.includes(localStorage.getItem('username')) ?
                //   (<div className="contact-profile">
                //     <img src="https://img.icons8.com/pastel-glyph/128/2C3E50/communication--v1.png"/>
                //     <p> {this.props.name ? this.props.name : window.location.pathname.slice(1) ? `Chat # ${window.location.pathname.slice(1)}`:null} </p>
                //     {this.props.participants && this.props.participants.includes(localStorage.getItem('username')) ?   <div className="social-media">
                //     {this.props.admins && this.props.admins.includes(this.props.currentUser) ? 
                //         <Button type="primary" style={{ background: "#32465A", borderColor: "green" }} onClick={(e)=>{e.preventDefault();this.props.addMemeber()}}>
                //             Add memeber
                //         </Button>
                //     : null}
                //     <Button   style={{ background: "#32465A", borderColor: "green" , color:"white"}} danger onClick={(e)=>{e.preventDefault();this.leave();}}>
                //         Leave
                //     </Button>
                //     {this.props.admins && this.props.admins.includes(this.props.currentUser) ? 
                //         <Button type="primary" danger  style={{ background: "#32465A", borderColor: "green" }}>
                //             Delete 
                //         </Button>
                //     : null}
                //     </div>: null}
                //   </div>)
                <div className="contact-profile">
                <img src="https://img.icons8.com/pastel-glyph/128/2C3E50/communication--v1.png"/>
                <p> {this.props.name ? this.props.name : window.location.pathname.slice(1) ? `Chat # ${window.location.pathname.slice(1)}`:null} </p>
                {this.props.participants && this.props.participants.includes(localStorage.getItem('username')) ?  
                 <div className="social-media">
                <Dropdown.Button overlay={
                    <Menu theme='dark' >
                    {console.log("in drop dwon ",!(this.props.admins && this.props.admins.includes(this.props.currentUser)))}
                     <Menu.Item key="1" disabled={!(this.props.admins && this.props.admins.includes(this.props.currentUser))}  onClick={()=>{this.props.addMemeber()}}>
                             Add memeber
                     </Menu.Item>
                     <Menu.Item key="2" disabled={!(this.props.admins && this.props.admins.includes(this.props.currentUser))} > 
                             Delete Chat
                     </Menu.Item>
                 </Menu>
                }
                
                trigger={'click'}
                style={{ background: "#32465A", borderColor: "green" , color:"white"}} 
                onClick={(e)=>{e.preventDefault();this.leave();}}
                >
                Leave Chat
                </Dropdown.Button>
                </div>: null}
                </div>
                  : null}
                  {! this.props.main ?<div>
                  <div id="messagesWindow" className="messages">
                    <ul id="chat-log"> 
                        {console.log('messages',[...new Set(messages)])}
                        {messages && this.renderMessages(messages,this.props.participantsCount,this.props.participants)}
                        <li><div style={{ float:"left", clear: "both" }}
                              ref={this.messagesEndRef} >
                        </div></li>
                    </ul>
                  </div>
                  {this.props.participants && this.props.participants.includes(localStorage.getItem('username')) ? <div className="messages-dial">
                  <form onSubmit={this.sendMessageHandler}>
                  <div className="message-input">
                    <div className="wrap">
                        {console.log('message',this.state.message)}
                        {/* https://stackoverflow.com/questions/11495200/how-do-negative-margins-in-css-work-and-why-is-margin-top-5-margin-bottom5 */}
                        <textarea 
                        onChange={this.changeMessageHandler}
                        ref={this.textareaRef}
                        value={
                             !this.state.flag ?
                             this.state.message
                             :""
                            }
                         id="chat-message-input" placeholder="Write your message..."
                     ></textarea> 
                    {/* <input
                    onChange={this.changeMessageHandler}
                    value={
                         !this.state.flag ?
                         this.state.message
                         :""
                        }
                     id="chat-message-input" type="text" placeholder="Write your message..." />  */}

        
                    <button id="chat-message-submit" className="submit">
                     <i className="fa fa-paper-plane" aria-hidden="true"></i>
                    </button>
            
                    <button id="chat-message-attach" onClick={this.showModal}>
                    <i className="fa fa-paperclip attachment" aria-hidden="true"></i>
                    </button>     

                    </div>
                  </div>
                  </form>
                  </div>:null}
                  </div>
                      :null}
                </div>
              </div>        
            )}
        //else {
            // console.log("to logout in chat")
            // window.location.pathname = '/login'}
        else {
            {console.log("in login page ")}
            // window.history.pushState({}, '', '/login');
            return <Login />
        }     
      
    }
}

const mapDispatchToProps =(dispatch) =>{
    return {
        addMemeber : () =>dispatch(navActions.openAddMemeberPopup()),
        getChats : (username,token) =>dispatch(messageActions.getUserChats(username,token)),
    }
}
const mapStateToProps =(state)=>{
    return{
    messages :state.message.messages,
    participants:state.message.participants ,
    participantsCount:state.message.participantsCount ,
    name : state.message.name,
    token:state.auth.token,
    currentUser : state.auth.username,
    admins : state.message.admins
    }
}
export default connect(mapStateToProps,mapDispatchToProps)(Chat)