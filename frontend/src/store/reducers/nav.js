import * as actionTypes from '../actions/actionTypes'
import {updateObject} from '../utility'

const initialState = {
    showAddChatPopup : false,
    showAddMemeberPopup : false
}

const openAddChatPopup =(state,action)=>{
    return updateObject(state,{
        showAddChatPopup : true
    })
}

const closeAddChatPopup =(state,action)=>{
    return updateObject(state,{
        showAddChatPopup : false
    })
}

const openAddMemeberPopup =(state,action)=>{
    return updateObject(state,{
        showAddMemeberPopup : true
    })
}

const closeAddMemeberPopup =(state,action)=>{
    return updateObject(state,{
        showAddMemeberPopup : false
    })
}


const reducer = (state={initialState},action) => {
    switch(action.type){
        case actionTypes.OPEN_ADD_CHAT_POPUP:return openAddChatPopup(state,action);
        case actionTypes.CLOSE_ADD_CHAT_POPUP:return closeAddChatPopup(state,action);
        case actionTypes.OPEN_ADD_MEMEBER_POPUP:return openAddMemeberPopup(state,action);
        case actionTypes.CLOSE_ADD_MEMEBER_POPUP:return closeAddMemeberPopup(state,action);
        default : return state;
    }
}

export default reducer;