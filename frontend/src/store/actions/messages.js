import * as actions from './actionTypes'
import axios from 'axios'

export const addMessages =(message)=>{
    return {
        type : actions.ADD_MESSAGE,
        message:message
    }
}

export const setMessages =(messages)=>{
    if (!messages[0])
        messages=[[],[]]
    console.log('messages action' ,messages)
    return {
        type : actions.SET_MESSAGES,
        messages:messages[0],
        participants:messages[1],
        name:messages[2],
        admins:messages[3],
        system_message:messages[4],
        participantsCount:messages[1].length
    }
}

export const getUserChatsSuccess =(chats)=>{
    return {
        type : actions.GET_CHATS_SUCCESS,
        chats:chats
    }
}

export const getUserChats = (username, token) => {
    return dispatch => {
        axios.defaults.xsrfHeaderName = "X-CSRFTOKEN";
        axios.defaults.xsrfCookieName = "csrftoken";
        axios.defaults.headers = {
        "Content-Type": "application/json",
        Authorization: `Token ${token}`
        };
        axios
        .get(`http://127.0.0.1:8000/chat/?username=${username}`)
        .then(res => {dispatch(getUserChatsSuccess(res.data))
            console.log('res.data at getUserChats ',res.data)
        } ).catch(err =>{
            console.log('error at getUserChats ',err)
        });
    };
    };