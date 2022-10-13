import { LockOutlined, UserOutlined } from '@ant-design/icons';
import { Button, Checkbox, Form, Input ,message,Spin} from 'antd';
import React , {useEffect} from 'react';
import { connect } from 'react-redux';
import { Link } from 'react-router-dom';
import * as actions from '../store/actions/auth'
import { useNavigate } from "react-router-dom"

const Login = (props) => {

console.log("in login page ")

const navigate = useNavigate();

const [form] = Form.useForm();

const onFinish = (values) => {
  //if(!props.error){
    props.onAuth(values.username,values.password);
    console.log('Received values of form: ', values);
    localStorage.setItem('username',values.username)
    //message.success("Logged in Successfully ",2.5,navigate(`/`));
    //navigate(`/`);
 // }
};

useEffect(() => { 
  if(props.error)
    props.onReset()
  },[props]);

return (
  
  <Spin spinning={props.loading} style={{color:"black"}}>
    {localStorage.getItem('token') != null ? message.success("Logged in Successfully ",1.5,navigate(`/`)): null}  
    {props.error? message.error("Something went wrong please try again... ",5) && navigate('/login'): null}
          <Form
    name="normal_login"
    form={form}
    className="login-form"
    initialValues={{
      remember: true,
    }}
    onFinish={onFinish}
  >
    <Form.Item
      name="username"
      rules={[
        {
          required: true,
          message: 'Please input your Username!',
        },
      ]}
    >
      <Input prefix={<UserOutlined className="site-form-item-icon" />} placeholder="Username" />
    </Form.Item>
    <Form.Item
      name="password"
      rules={[
        {
          required: true,
          message: 'Please input your Password!',
        },
      ]}
    >
      <Input
        prefix={<LockOutlined className="site-form-item-icon" />}
        type="password"
        placeholder="Password"
      />
    </Form.Item>
    <Form.Item>
      <Form.Item name="remember" valuePropName="checked" noStyle>
        <Checkbox>Remember me</Checkbox>
      </Form.Item>

      <a className="login-form-forgot" href="">
        Forgot password
      </a>
    </Form.Item>

    <Form.Item>
      <Button type="primary" htmlType="submit" className="login-form-button" >
        Log in
      </Button>
      Or <Link to={{pathname:'/register'}} activeclassname="active" onClick={props.onReset}>register now!</Link>
    </Form.Item>
  </Form>
  </Spin>
);
};

const mapStateToProps=(state)=>{
  return{
    loading:state.auth.loading,
    error:state.auth.error
  }      
}

const mapDispatchToProps=(dispatch)=>{
  return {
      onAuth:(username,password)=> dispatch(actions.authLogin(username,password)),
      onReset:()=>{dispatch(actions.authReset())}

  }
}
export default connect(mapStateToProps,mapDispatchToProps)(Login);
