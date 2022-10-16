import { Button, Form, message ,Select ,Radio } from 'antd';
import React, { useState } from 'react';
import axios from 'axios';
import * as navActions from '../store/actions/nav' 
import * as messageActions from '../store/actions/messages' 
import { connect } from 'react-redux';
import {useNavigate} from 'react-router-dom';
const KickMemeberForm = (props) => {

  const [usernames ,SetUsernames] = useState([])
  const [value, setValue] = useState('Participant');
  /**https://github.com/pmndrs/react-three-fiber/issues/2134 */


  const navigate = useNavigate()

  /*** https://stackoverflow.com/questions/53919499/clear-form-input-field-values-after-submitting-in-react-js-with-ant-design */

  const [form] = Form.useForm();

  const handleChange = value =>{
    SetUsernames(value)
  }

  const KickMemeber = (values,token) =>{
    console.log(values.Contacts,token)
    const chatId =window.location.pathname.slice(1);
    axios.defaults.xsrfHeaderName = "X-CSRFTOKEN";
    axios.defaults.xsrfCookieName = "csrftoken";
    axios.defaults.headers = {
      'Content-Type' : 'application/json',
      Authorization :`Token ${props.token}`
    }
    let newPart =[]
    console.log("Values type : ",[...props.participants],[...values.Contacts])
    for (let i =0 ; i<[...props.participants].length ; i++){
      if(!([...values.Contacts].includes([...props.participants][i])))
      newPart.push([...props.participants][i])
    }
     console.log("new Partcipants ",newPart)
     let content =  {
          "command" :"kick",
          "username": props.username,
          "messages": [],
          "participants":newPart,
          'admins':[]
          }
    console.log(content)
    axios.put(`http://127.0.0.1:8000/chat/${chatId}/update/`,content
        ).then(res=>{
            console.log(res.data)
            message.success('Memeber(s) were kicked successfully',5)
        }).catch(err =>{
            console.log(`error at create chat ${err}`)
            message.error('something went wrong please try again later...! ',5)
          });
  }
  const onFinish = (values) => {
    console.log('participants: ',[localStorage.getItem('username'),...values.Contacts]);
    KickMemeber(values,props.token)
    form.resetFields()
    setValue('Participants');
    props.close()
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
        {props.participants.map(p =>{
          if (p !== props.username)
          return ((<Option key={p}>{p}</Option>))
        })}
      </Select>
      </Form.Item>
      
      <Form.Item
        wrapperCol={{
          offset: 8,
          span: 16,
        }}
      >
        <Button type="primary" htmlType="submit">
            Kick
        </Button>
      </Form.Item>
    </Form>
  );
};

const mapStateToProps=(state)=>{
  return{
    token :state.auth.token,
    participants :state.message.participants,
    username :state.auth.username
}      
}
const mapDispatchToProps=(dispatch)=>{
  return {
      closeOnSubmit:()=>{dispatch(navActions.closeAddMemeberPopup())},
      getuserChats : (username,token) =>{dispatch(messageActions.getUserChats(username,token))}
  }
}
export default connect(mapStateToProps,mapDispatchToProps)(KickMemeberForm);
