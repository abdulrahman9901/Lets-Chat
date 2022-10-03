import * as actionTypes from '../actions/actionTypes'
import {updateObject} from '../utility'

const initialState = {
    messages:[],
    chats:[]
}

const addMessage =(state,action)=>{
    return updateObject(state,{
        messages:[...state.messages,action.message]
    })
}

const setMessages =(state,action)=>{
    console.log(action)
    return updateObject(state,{
        messages: action.messages.reverse(),
        participants:action.participants,
        admins:action.admins,
        participantsCount:action.participantsCount,
        name: action.name,
        system_message:action.system_message
    })
}

const getUserChats =(state,action)=>{
    return updateObject(state,{
        chats:action.chats
    })
}
const reducer = (state={initialState},action) => {
    switch(action.type){
        case actionTypes.ADD_MESSAGE:return addMessage(state,action);
        case actionTypes.SET_MESSAGES:return setMessages(state,action);
        case actionTypes.GET_CHATS_SUCCESS:return getUserChats(state,action);
        default : return state;
    }
}

export default reducer;