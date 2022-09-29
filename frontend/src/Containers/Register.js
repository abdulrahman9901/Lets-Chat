import {
    Button,
    Checkbox,
    Col,
    Form,
    Input,
    Row,
    Select,
    Spin,
    message,

  } from 'antd';
import { Link } from 'react-router-dom';
import * as actions from '../store/actions/auth'
import { connect } from 'react-redux';
import { useNavigate } from "react-router-dom"
import React from 'react';

  const { Option } = Select;

  const formItemLayout = {
    labelCol: {
      xs: {
        span: 24,
      },
      sm: {
        span: 8,
      },
    },
    wrapperCol: {
      xs: {
        span: 24,
      },
      sm: {
        span: 16,
      },
    },
  };
  const tailFormItemLayout = {
    wrapperCol: {
      xs: {
        span: 24,
        offset: 0,
      },
      sm: {
        span: 16,
        offset: 8,
      },
    },
  };
  
  const Register = (props) => {

    const navigate = useNavigate();

    const [form] = Form.useForm();
  
  const onFinish = (values) => {
      props.onAuth(values.username,values.email,values.password,values.confirm,values.gender,values.phone);
      console.log('data of signup',values)
      localStorage.setItem('username',values.username)
      //navigate(`/register`);
    };
  
    const prefixSelector = (
      <Form.Item name="prefix" noStyle>
        <Select
          style={{
            width: 70,
          }}
        >
          <Option value="86">+86</Option>
          <Option value="87">+87</Option>
        </Select>
      </Form.Item>
    );

    return (
      <Spin spinning={props.loading}>
      {localStorage.getItem('token') !== null ?message.success("Registration done Successfully and you automatically logged in",3,navigate(`/`)): null}  
      {props.error ? message.error("Something went wrong please try again... ",5) && console.log('error at register is : ',props.error) && props.onReset() : null}
      <Form
        {...formItemLayout}
        className="reg_form"
        form={form}
        name="register"
        onFinish={onFinish}
        initialValues={{
          prefix: '86',
        }}
        scrollToFirstError
      >
      <Form.Item
          name="username"
          label="username"
          tooltip="What do you want others to call you?"
          rules={[
            {
              required: true,
              message: 'Please input your username!',
              whitespace: true,
            },
          ]}
        >
          <Input />
        </Form.Item>
        <Form.Item
          name="email"
          label="E-mail"
          rules={[
            {
              type: 'email',
              message: 'The input is not valid E-mail!',
            },
            {
              required: true,
              message: 'Please input your E-mail!',
            },
          ]}
        >
          <Input />
        </Form.Item>
  
        <Form.Item
          name="password"
          label="Password"
          rules={[
            {
              required: true,
              message: 'Please input your password!',
            },
          ]}
          hasFeedback
        >
          <Input.Password />
        </Form.Item>
  
        <Form.Item
          name="confirm"
          label="Confirm Password"
          dependencies={['password']}
          hasFeedback
          rules={[
            {
              required: true,
              message: 'Please confirm your password!',
            },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue('password') === value) {
                  return Promise.resolve();
                }
  
                return Promise.reject(new Error('The two passwords that you entered do not match!'));
              },
            }),
          ]}
        >
          <Input.Password />
        </Form.Item>
        <Form.Item
          name="phone"
          label="Phone Number"
          rules={[
            {
              required: true,
              message: 'Please input your phone number!',
            },
          ]}
        >
          <Input
            addonBefore={prefixSelector}
            style={{
              width: '100%',
            }}
          />
        </Form.Item>
{/* 
        <Form.Item
          name="intro"
          label="Intro"
          rules={[
            {
              required: true,
              message: 'Please input Intro',
            },
          ]}
        >
          <Input.TextArea showCount maxLength={100} />
        </Form.Item>
   */}
        <Form.Item
          name="gender"
          label="Gender"
          rules={[
            {
              required: true,
              message: 'Please select gender!',
            },
          ]}
        >
          <Select placeholder="select your gender">
            <Option value="M">Male</Option>
            <Option value="F">Female</Option>
            <Option value="NS">Not Specified</Option>
          </Select>
        </Form.Item>
  {/* https://blog.logrocket.com/implement-recaptcha-react-application/ */}
        <Form.Item label="Captcha" extra="We must make sure that your are a human.">
          <Row gutter={8}>
            <Col span={12}>
              <Form.Item
                name="captcha"
                noStyle
                rules={[
                  {
                    required: true,
                    message: 'Please input the captcha you got!',
                  },
                ]}
              >
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Button>Get captcha</Button>
            </Col>
          </Row>
        </Form.Item>
  
        <Form.Item
          name="agreement"
          valuePropName="checked"
          rules={[
            {
              validator: (_, value) =>
                value ? Promise.resolve() : Promise.reject(new Error('Should accept agreement')),
            },
          ]}
          {...tailFormItemLayout}
        >
          <Checkbox>
            I have read the <a href="">agreement</a>
          </Checkbox>
        </Form.Item>
        <Form.Item {...tailFormItemLayout}>
          <Button type="primary" htmlType="submit">
            Register
          </Button>
          <Button type="secondry" className="cancel-btn" htmlType="submit" onClick={e => {e.preventDefault();props.onReset()}}>
            <Link to={{pathname:'/login'}}>Cancel</Link> 
          </Button>
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
        onAuth:(username,email,password1,password2,gender,phone)=> dispatch(actions.authSignup(username,email,password1,password2,gender,phone)),
        onReset:()=>dispatch(actions.authReset())
    }
}
export default connect(mapStateToProps,mapDispatchToProps)(Register);
  