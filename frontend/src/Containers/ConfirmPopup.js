import {Modal ,Button ,Form, Space } from 'antd';
import React, { useState } from 'react';
const ConfirmModal = (props) => {
  const [confirmLoading, setConfirmLoading] = useState(false);

  console.log('at modal ',props)

  const onFinish = () =>{

  }
  const handleOk = () => {
    setConfirmLoading(true);
    setTimeout(() => {
      setConfirmLoading(false);
      //props.action()
      props.onClose()
    }, 2000);
  };

  const handleCancel = () => {
    setTimeout(() => {
      props.onClose()
    }, 10);
  };
return (
      <Modal
        width={300}
        centered
        open={props.isVisible}
        onCancel={handleCancel}
        onOk={handleOk}
      >
      <Space
      style={{
        width:'250px'
      }}
    >Are sure that you want to do that </Space>
  {/* <Form
      name="basic"
      wrapperCol={{
        span: 16,
      }}
      onFinish={onFinish}
    > 
    <Form.Item
       wrapperCol={{
        span: 16,
      }}
    >
    <Space
      style={{
        width:'250px'
      }}
    >Are sure that you want to do that </Space>
    </Form.Item>
      <Form.Item
        wrapperCol={{
          span: 16,
        }}
      >
        <Button style={{marginLeft: '100px'}} type="primary" htmlType="submit">
            Yes
        </Button>
      </Form.Item>
  </Form> */}
      </Modal>
  );
};

export default ConfirmModal;
