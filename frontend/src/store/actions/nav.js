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

export const openJoinChatPopup =()=>{
    return {
        type : actions.OPEN_JOIN_CHAT_POPUP
    }
}

export const closeJoinChatPopup =()=>{
    return {
        type : actions.CLOSE_JOIN_CHAT_POPUP
    }
}


export const openAddMemeberPopup =()=>{
    return {
        type : actions.OPEN_ADD_MEMEBER_POPUP
    }
}

export const closeAddMemeberPopup =()=>{
    return {
        type : actions.CLOSE_ADD_MEMEBER_POPUP
    }
}