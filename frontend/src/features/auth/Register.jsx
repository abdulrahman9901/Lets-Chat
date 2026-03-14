import { Button, Checkbox, Col, Form, Input, Row, Select, Spin, message } from 'antd';
import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { signup, resetError } from './authSlice';

const { Option } = Select;

const formItemLayout = {
  labelCol: { xs: { span: 24 }, sm: { span: 8 } },
  wrapperCol: { xs: { span: 24 }, sm: { span: 16 } },
};

const tailFormItemLayout = {
  wrapperCol: { xs: { span: 24, offset: 0 }, sm: { span: 16, offset: 8 } },
};

export default function RegisterPage() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { loading, error, token } = useSelector((state) => state.auth);
  const [form] = Form.useForm();

  useEffect(() => {
    if (token) {
      message.success('Registration successful. You are logged in.', 3);
      navigate('/');
    }
  }, [token, navigate]);

  useEffect(() => {
    if (error) {
      message.error('Something went wrong, please try again.', 5);
      dispatch(resetError());
    }
  }, [error, dispatch]);

  const onFinish = (values) => {
    dispatch(
      signup({
        username: values.username,
        email: values.email,
        password1: values.password,
        password2: values.confirm,
        gender: values.gender,
        phone_number: values.phone,
      })
    );
  };

  const prefixSelector = (
    <Form.Item name="prefix" noStyle>
      <Select style={{ width: 70 }}>
        <Option value="86">+86</Option>
        <Option value="87">+87</Option>
      </Select>
    </Form.Item>
  );

  return (
    <Spin spinning={loading}>
      <Form
        {...formItemLayout}
        className="reg_form"
        form={form}
        name="register"
        onFinish={onFinish}
        initialValues={{ prefix: '86' }}
        scrollToFirstError
      >
        <Form.Item
          name="username"
          label="Username"
          rules={[{ required: true, message: 'Please input your username!', whitespace: true }]}
        >
          <Input />
        </Form.Item>
        <Form.Item
          name="email"
          label="E-mail"
          rules={[
            { type: 'email', message: 'The input is not valid E-mail!' },
            { required: true, message: 'Please input your E-mail!' },
          ]}
        >
          <Input />
        </Form.Item>
        <Form.Item
          name="password"
          label="Password"
          rules={[{ required: true, message: 'Please input your password!' }]}
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
            { required: true, message: 'Please confirm your password!' },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue('password') === value) return Promise.resolve();
                return Promise.reject(new Error('The two passwords do not match!'));
              },
            }),
          ]}
        >
          <Input.Password />
        </Form.Item>
        <Form.Item
          name="phone"
          label="Phone Number"
          rules={[{ required: true, message: 'Please input your phone number!' }]}
        >
          <Input addonBefore={prefixSelector} style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item
          name="gender"
          label="Gender"
          rules={[{ required: true, message: 'Please select gender!' }]}
        >
          <Select placeholder="Select your gender">
            <Option value="M">Male</Option>
            <Option value="F">Female</Option>
            <Option value="NS">Not Specified</Option>
          </Select>
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
          <Checkbox>I have read the agreement</Checkbox>
        </Form.Item>
        <Form.Item {...tailFormItemLayout}>
          <Button type="primary" htmlType="submit">
            Register
          </Button>
          <Button
            type="default"
            className="cancel-btn"
            onClick={(e) => {
              e.preventDefault();
              dispatch(resetError());
            }}
          >
            <Link to="/login">Cancel</Link>
          </Button>
        </Form.Item>
      </Form>
    </Spin>
  );
}
