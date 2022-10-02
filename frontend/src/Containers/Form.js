import { Button, Form, Input ,Select , message } from 'antd';
import React, { useState } from 'react';
import axios from 'axios';
import * as navActions from '../store/actions/nav' 
import * as messageActions from '../store/actions/messages' 
import { connect } from 'react-redux';
import { useHistory , useNavigate} from 'react-router-dom';
import webSocketInstance from '../websocket';

const AddChatForm = (props) => {

  const [usernames ,SetUsernames] = useState([])

  /**https://github.com/pmndrs/react-three-fiber/issues/2134 */

  // const { history } = useHistory();

  const navigate = useNavigate()

  /*** https://stackoverflow.com/questions/53919499/clear-form-input-field-values-after-submitting-in-react-js-with-ant-design */

  const [form] = Form.useForm();

  const handleChange = value =>{
    SetUsernames(value)
  }

  const createChat = (values,token) =>{
    console.log(values.Contacts,token,props.username)
    axios.defaults.xsrfHeaderName = "X-CSRFTOKEN";
    axios.defaults.xsrfCookieName = "csrftoken";
    axios.defaults.headers = {
      'Content-Type' : 'application/json',
      Authorization :`Token ${props.token}`
    }
    axios.post('http://127.0.0.1:8000/chat/create/',
            {
              "messages": [],
              "admins":[props.username],
              "participants":[props.username,...values.Contacts],
              "name":values.Chat_name
            }
        ).then(res=>{
            console.log(res.data)
            //message.success('Chat created successfully',5)
            props.getuserChats(props.username,props.token)
            webSocketInstance.fetchMessages(props.username,res.data.id);
            navigate(`/${res.data.id}`)
        }).catch(err =>{
            console.log(`error at create chat ${err}`)
            message.error('something went wrong olease try again later...! ',5)
          });
  }
  const onFinish = (values) => {
    console.log('participants: ',[localStorage.getItem('username'),...values.Contacts]);
    createChat(values,props.token)
    form.resetFields()
    props.closeOnSubmit()
  };

  const onFinishFailed = (errorInfo) => {
    console.log('Failed:', errorInfo);
  };

  return (
    <Form
      name="basic"
      form={form}
      labelCol={{
        span: 8,
      }}
      wrapperCol={{
        span: 16,
      }}
      onFinish={onFinish}
      onFinishFailed={onFinishFailed}
      autoComplete="off"
    >
      <Form.Item
        label="Chat name"
        name='Chat_name'
        rules={[
          {
            required: true,
            message: 'Please input the Chat name !',
          },
        ]}
      >
        <Input />
      </Form.Item>
      <Form.Item
        label="Contacts"
        name='Contacts'
        rules={[
          {
            required: true,
          },
        ]}
      > 
      <Select
        mode="tags"
        placeholder="Please select"
        defaultValue={[]}
        onChange={handleChange}
        style={{
          width: '100%',
        }}
      >
        {usernames}
      </Select>
      </Form.Item>
      <Form.Item
        wrapperCol={{
          offset: 8,
          span: 16,
        }}
      >
        <Button type="primary" htmlType="submit">
          Start New Chat 
        </Button>
      </Form.Item>
    </Form>
  );
};

const mapStateToProps=(state)=>{
  return{
    token :state.auth.token,
    username :localStorage.getItem('username')
  }      
}
const mapDispatchToProps=(dispatch)=>{
  return {
      closeOnSubmit:()=>{dispatch(navActions.closeAddChatPopup())},
      getuserChats : (username,token) =>{dispatch(messageActions.getUserChats(username,token))}
  }
}
export default connect(mapStateToProps,mapDispatchToProps)(AddChatForm);
