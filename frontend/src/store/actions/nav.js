import * as actions from './actionTypes'

export const openAddChatPopup =()=>{
    return {
        type : actions.OPEN_ADD_CHAT_POPUP
    }
}

export const closeAddChatPopup =()=>{
    return {
        type : actions.CLOSE_ADD_CHAT_POPUP
    }
}