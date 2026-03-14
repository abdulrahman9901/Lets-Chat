import { LockOutlined, UserOutlined } from '@ant-design/icons';
import { Button, Checkbox, Form, Input, message, Spin } from 'antd';
import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { login, resetError } from './authSlice';

export default function LoginPage() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { loading, error, token } = useSelector((state) => state.auth);
  const [form] = Form.useForm();

  useEffect(() => {
    if (error) dispatch(resetError());
  }, [error, dispatch]);

  useEffect(() => {
    if (token) {
      message.success('Logged in successfully', 1.5);
      navigate('/');
    }
  }, [token, navigate]);

  useEffect(() => {
    if (error) message.error('Something went wrong, please try again.', 5);
  }, [error]);

  const onFinish = (values) => {
    dispatch(login({ username: values.username, password: values.password }));
  };

  return (
    <Spin spinning={loading} style={{ color: 'black' }}>
      <Form
        name="normal_login"
        form={form}
        className="login-form"
        initialValues={{ remember: true }}
        onFinish={onFinish}
      >
        <Form.Item
          name="username"
          rules={[{ required: true, message: 'Please input your Username!' }]}
        >
          <Input prefix={<UserOutlined className="site-form-item-icon" />} placeholder="Username" />
        </Form.Item>
        <Form.Item
          name="password"
          rules={[{ required: true, message: 'Please input your Password!' }]}
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
          <Button type="primary" htmlType="submit" className="login-form-button">
            Log in
          </Button>
          Or{' '}
          <Link to="/register" onClick={() => dispatch(resetError())}>
            register now!
          </Link>
        </Form.Item>
      </Form>
    </Spin>
  );
}
