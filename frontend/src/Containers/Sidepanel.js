
import React from "react";
import Dropmenu from "./Dropdown";
import { connect } from "react-redux";
import * as authActions from '../store/actions/auth'
import * as navActions from '../store/actions/nav'
import * as messageActions from '../store/actions/messages'
import Contact from "../Components/Contacts";
import webSocketInstance from '../websocket';

class Sidepanel extends React.Component{
  state ={
    searchTerm:'',
  }

// getUserChats = (token,username) => {
//   console.log('get chat on ')
//   axios.defaults.xsrfHeaderName = "X-CSRFTOKEN";
//   axios.defaults.xsrfCookieName = "csrftoken";
//   axios.defaults.headers = {
//     'Content-Type' : 'application/json',
//     Authorization :`Token ${token}`
//   }
//   axios.get(`http://127.0.0.1:8000/chat/?username=${username}`).then(
//     res => {
//       console.log(res.data);
//       this.setState({
//         chats:res.data
//       })
//     }
//   )
//   }

openAddChatPopup = ()=>{
  this.props.addChat()
}

openJoinChatPopup = ()=>{
  this.props.joinChat()
}

componentWillReceiveProps(newProps) {
  console.log(`newProps = ${newProps}`)
  console.log(newProps.chats.length , this.props.chats.length)
      if(newProps.token != null  && newProps.username != null){
          if(this.props.chats.length <=0 || (newProps.chats.length !== this.props.chats.length)){
          console.log('get in if ');
          this.props.getChats(newProps.username,newProps.token)
          console.log('after req',this.state)
          }
      }
}

componentDidMount(){
  console.log('at sidepanel componentDidMount',this.props)
    if(this.props.token!= null  && this.props.username != null){
    this.props.getChats(this.props.username,this.props.token)
  }
}

searchBarHandler= e =>{
  e.preventDefault();
  this.setState({
      searchTerm:e.target.value
  },function () {
      console.log('state is : ' ,this.state);
  });
}

toMessages = ()=>{
 if( window.location.pathname.slice(1) !== "" ){
  document.getElementById('content').style.display = "block" 
  document.getElementById('sidepanel').style.display = "none" 
  }
}
render(){
  console.log('at sidepanel',this.props)
  //console.log('at render',this.props.chats[0])
  //const aciveChats=null
  
  let aciveChats;
  if (this.props.chats){
        console.log(" if chats")
        aciveChats = this.props.chats.filter((chat => {
          if (this.state.searchTerm == '')
          {
            return chat;
          }
          else if(chat.name.toLowerCase().includes(this.state.searchTerm.toLowerCase()))
          {
            return chat;
          }
        })).map(chat => {
        return <Contact 
        key={chat.id}
        chatURL={`/${chat.id}`}
        status='online'
        picURL ="https://img.icons8.com/pastel-glyph/128/E6EAEA/communication--v1.png"
        name={ chat.name ? chat.name :`Chat # ${chat.id}`}
        members={chat.participants}
        currentUser = {this.props.username}
    />
    })
  }else {
    console.log(" else chats")
    aciveChats = null;
  }
  
    return(
        <div id="sidepanel">
        <div id="profile">
          <div className="wrap">
            <img id="profile-img" src="https://img.icons8.com/ios-filled/100/95a5a6/user-male-circle.png" className="online" alt="" />
            <p>{this.props.username}</p>
            {/* <Dropmenu /> */}
            <button onClick={this.toMessages} id="toMessages" className="btn"><i className="fa fa-arrow-right" aria-hidden="true"></i></button>
            <div id="expanded">
                <button className="authBtn" onClick={()=>this.props.onLogout()}>
                  <span>Logout</span>
                </button>
            </div>
          </div>
        </div>
        <div id="search">
          <label htmlFor=""><i className="fa fa-search" aria-hidden="true"></i></label>
          <input type="text" placeholder="Search chats..." onChange={this.searchBarHandler} onClick={e=>e.preventDefault()}/>
        </div>
        <div id="contacts">
          <ul>
            { aciveChats }
          </ul>
        </div>
        <div id="bottom-bar">
          <button id="addcontact" onClick={() => this.openAddChatPopup()}><i className="fa fa-user-plus fa-fw" aria-hidden="true"></i> <span>Create Chat</span></button>
          <button id="joinChat" onClick={() => this.openJoinChatPopup()} ><i className="fa fa-cog fa-fw" aria-hidden="true"></i> <span>Join chat </span></button>
        </div>
      </div>
    )
}
}
const mapStateToProps=(state)=>{
  return{
    loading:state.auth.loading,
    isAuthenticated:state.auth.token !== null,
    token :state.auth.token,
    username :state.auth.username,
    chats:state.message.chats ? state.message.chats : []
  }      
}
const mapDispatchToProps=(dispatch)=>{
  return {
      onLogout:()=>dispatch(authActions.logout()),
      addChat : () =>dispatch(navActions.openAddChatPopup()),
      joinChat : () =>dispatch(navActions.openJoinChatPopup()),
      getChats : (username,token) =>dispatch(messageActions.getUserChats(username,token))

  }
}
export default connect(mapStateToProps,mapDispatchToProps)(Sidepanel);
