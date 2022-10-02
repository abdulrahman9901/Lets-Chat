import { Button, Form, message ,Select } from 'antd';
import React, { useState } from 'react';
import axios from 'axios';
import * as navActions from '../store/actions/nav' 
import * as messageActions from '../store/actions/messages' 
import { connect } from 'react-redux';
import {useNavigate} from 'react-router-dom';
const AddMemeberForm = (props) => {

  const [usernames ,SetUsernames] = useState([])

  /**https://github.com/pmndrs/react-three-fiber/issues/2134 */

  // const { history } = useHistory();

  const navigate = useNavigate()

  /*** https://stackoverflow.com/questions/53919499/clear-form-input-field-values-after-submitting-in-react-js-with-ant-design */

  const [form] = Form.useForm();

  const handleChange = value =>{
    SetUsernames(value)
  }


//   triggerUpdate =(e)=> {
//     console.log('triggered')
//     const chatId =window.location.pathname.slice(1);
//     axios.defaults.xsrfHeaderName = "X-CSRFTOKEN";
//     axios.defaults.xsrfCookieName = "csrftoken";
//     axios.defaults.headers = {
//     "Content-Type": "application/json",
//     Authorization: `Token ${this.props.token}`
//     };
//     axios
//     .put(`http://127.0.0.1:8000/chat/${chatId}/update/`,
//     { 
//         "command":'add',
//         "name": "new name",
//         "messages": [],
//         "participants": []
//     }
//     )
//     .then(res => 
//         (console.log(res.data))
//     );
// }
  const addMemeber = (values,token) =>{
    console.log(values.Contacts,token)
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
            "participants":[...props.participants,...values.Contacts],
            }
        ).then(res=>{
            console.log(res.data)
            message.success('Memebers were added successfully',5)
        }).catch(err =>{
            console.log(`error at create chat ${err}`)
            message.error('something went wrong olease try again later...! ',5)
          });
  }
  const onFinish = (values) => {
    console.log('participants: ',[localStorage.getItem('username'),...values.Contacts]);
    addMemeber(values,props.token)
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
            Add
        </Button>
      </Form.Item>
    </Form>
  );
};

const mapStateToProps=(state)=>{
  return{
    token :state.auth.token,
    participants :state.message.participants
}      
}
const mapDispatchToProps=(dispatch)=>{
  return {
      closeOnSubmit:()=>{dispatch(navActions.closeAddMemeberPopup())},
      getuserChats : (username,token) =>{dispatch(messageActions.getUserChats(username,token))}
  }
}
export default connect(mapStateToProps,mapDispatchToProps)(AddMemeberForm);
