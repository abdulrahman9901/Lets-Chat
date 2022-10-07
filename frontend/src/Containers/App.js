import React from 'react';
import Chat from './Chat';
import {connect} from 'react-redux'
import * as authActions from '../store/actions/auth' 
import * as navActions from '../store/actions/nav' 
import * as messagesActions from '../store/actions/messages' 
import { Route, Routes } from 'react-router-dom';
import Login  from './Login';
import Register  from './Register';
import webSocketInstance from '../websocket';
class App extends React.Component {
    componentDidMount(){
        this.props.onTryAutoSignup();
    }
    constructor(props){
        super(props)
        webSocketInstance.addCallbacks(
            this.props.setMessages.bind(this),
            this.props.addMessage.bind(this),
        )
    }
    render(){
        return (
            <div>
            <Routes>
            <Route path="/login" element={ <Login /> } />
            <Route path="/register" element={ <Register /> } />
            <Route path="/:chatID" element={<Chat {...this.props}  main={false}/>} />
            <Route path="/" element={<Chat {...this.props} main={true} />} />
            {/* <Route path="*" element={<PageNotFound />} /> */}
            </Routes>
            </div>
        )
    }
}

const mapStateToProps=(state)=>{
    console.log("at app ",state)
    return{
        isAuthenticated:state.auth.token !== null,
        showAddChatPopup :state.nav.showAddChatPopup,
        showAddMemeberPopup :state.nav.showAddMemeberPopup,
        showJoinChatPopup :state.nav.showJoinChatPopup
    }
}
const mapDispatchToProps=(dispatch)=>{
    return{
        onTryAutoSignup:()=>{dispatch(authActions.authCheckState())},
        closeAddChatPopup :()=>{dispatch(navActions.closeAddChatPopup())},
        closeAddMemeberPopup :()=>{dispatch(navActions.closeAddMemeberPopup())},
        closeJoinChatPopup :()=>{dispatch(navActions.closeJoinChatPopup())},
        addMessage :(message)=>{dispatch(messagesActions.addMessages(message))},
        setMessages :(messages)=>{dispatch(messagesActions.setMessages(messages));dispatch(messagesActions.getUserChats())}
    }
}
export default connect(mapStateToProps,mapDispatchToProps)(App);
