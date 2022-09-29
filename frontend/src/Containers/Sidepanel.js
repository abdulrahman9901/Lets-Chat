
import React from "react";
import Dropmenu from "./Dropdown";
import { connect } from "react-redux";
import * as authActions from '../store/actions/auth'
import * as navActions from '../store/actions/nav'
import Contact from "../Components/Contacts";
import axios from "axios";

class Sidepanel extends React.Component{
  state ={
    chats:[],
  }

getUserChats = (token,username) => {
  console.log('get chat on ')
  axios.defaults.xsrfHeaderName = "X-CSRFTOKEN";
  axios.defaults.xsrfCookieName = "csrftoken";
  axios.defaults.headers = {
    'Content-Type' : 'application/json',
    Authorization :`Token ${token}`
  }
  axios.get(`http://127.0.0.1:8000/chat/?username=${username}`).then(
    res => {
      console.log(res.data);
      this.setState({
        chats:res.data
      })
    }
  )
  }

openAddChatPopup = ()=>{
  this.props.addChat()
}
componentWillReceiveProps(newProps) {
  console.log(`newProps = ${newProps.token}`)
      if(newProps.token != null  && newProps.username != null){
          console.log('get in if ');
          this.getUserChats(newProps.token ,newProps.username)
          console.log('after req',this.state)
      }
}

componentDidMount(){
  if(this.state.chats.length <= 0){
    if(this.props.token!= null  && this.props.username != null){
    this.getUserChats(this.props.token ,this.props.username)
    }
  }
}

render(){
  console.log('at render',this.state.chats[0])
  const aciveChats = this.state.chats.map(chat => {
        return <Contact 
        key={chat.id}
        chatURL={`/${chat.id}`}
        status='online'
        picURL ="https://img.icons8.com/pastel-glyph/128/E6EAEA/communication--v1.png"
        name={ chat.name ? chat.name :`Chat # ${chat.id}`}
        members={chat.participants}
    />
    })
    return(
        <div id="sidepanel">
        <div id="profile">
          <div className="wrap">
            <img id="profile-img" src="https://img.icons8.com/ios-filled/100/95a5a6/user-male-circle.png" className="online" alt="" />
            <p>{this.props.username}</p>
            <Dropmenu />
            <div id="expanded">
                <button className="authBtn" onClick={()=>this.props.onLogout()}>
                  <span>Logout</span>
                </button>
            </div>
          </div>
        </div>
        <div id="search">
          <label htmlFor=""><i className="fa fa-search" aria-hidden="true"></i></label>
          <input type="text" placeholder="Search contacts..." />
        </div>
        <div id="contacts">
          <ul>
            { aciveChats }
          </ul>
        </div>
        <div id="bottom-bar">
          <button id="addcontact" onClick={() => this.openAddChatPopup()}><i className="fa fa-user-plus fa-fw" aria-hidden="true"></i> <span>Add Chat</span></button>
          <button id="settings"><i className="fa fa-cog fa-fw" aria-hidden="true"></i> <span>Settings</span></button>
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
    chats:[]
  }      
}
const mapDispatchToProps=(dispatch)=>{
  return {
      onLogout:()=>dispatch(authActions.logout()),
      addChat : () =>dispatch(navActions.openAddChatPopup())

  }
}
export default connect(mapStateToProps,mapDispatchToProps)(Sidepanel);
