import React, { useState } from 'react';
import { Dropdown, Menu, message } from 'antd';
import axios from 'axios';
import { useNavigate } from "react-router-dom"
const Profile = (props) =>{
    const navigate = useNavigate();

    const leave =(props,message,navigate)=>{
        console.log(props.token)
        const chatId =window.location.pathname.slice(1);
        axios.defaults.xsrfHeaderName = "X-CSRFTOKEN";
        axios.defaults.xsrfCookieName = "csrftoken";
        axios.defaults.headers = {
            'Content-Type' : 'application/json',
            Authorization :`Token ${props.token}`
        }
        axios.put(`http://127.0.0.1:8000/chat/${chatId}/update/`,
                {
                "name": "new name",
                "messages": [],
                "admins" :[],
                "participants":props.participants.filter((p) =>{
                    return p !=localStorage.getItem('username')
                }),
                }
        ).then(res=>{
            console.log(res.data)
            //message.success('You have left the chat successfully',5)
            props.getChats(localStorage.getItem('username'),props.token)
            this.initializeChat();
            // window.history.pushState('', 'Home page', '/');
            window.location.pathname = '/'
            navigate("/")
            }).catch(err =>{
                console.log(`error at create chat ${err}`)
                //message.error('something went wrong olease try again later...! ',5)
            });
        }
    
    return (
    <div className="contact-profile">
    <img src="https://img.icons8.com/pastel-glyph/128/2C3E50/communication--v1.png"/>
    <p> {props.name ? props.name : window.location.pathname.slice(1) ? `Chat # ${window.location.pathname.slice(1)}`:null} </p>
    {props.participants && props.participants.includes(localStorage.getItem('username')) ?  
     <div className="social-media">
    <Dropdown.Button overlay={
        <Menu>
        {console.log(props)}
         <Menu.Item key="1" disabled={!props.admins && props.admins.includes(props.currentUser)}  onClick={()=>{props.addMemeber()}}>
                 Add memeber
         </Menu.Item>
         <Menu.Item key="2" disabled={!props.admins && props.admins.includes(props.currentUser)} > 
                 Delete Chat
         </Menu.Item>
     </Menu>
    }
    
    trigger={'click'}
    style={{ background: "#32465A", borderColor: "green" , color:"white"}} 
    onClick={(e)=>{e.preventDefault();leave(props,message,navigate);}}
    >
    Leave Chat
    </Dropdown.Button>
    </div>: null}
    </div>
    )
}

export default Profile;