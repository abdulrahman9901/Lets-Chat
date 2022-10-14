import {Modal ,Button } from 'antd';
import React, { useState } from 'react';
import AddMemeberForm from './MemeberForm';
const AddMemeberModal = (props) => {
  const [confirmLoading, setConfirmLoading] = useState(false);

  console.log('at modal ',props)


  const handleOk = () => {
    setConfirmLoading(true);
    setTimeout(() => {
      setConfirmLoading(false);
      props.close()
    }, 2000);
  };

  const handleCancel = () => {
    setTimeout(() => {
      props.close()
    }, 10);
  };
return (
      <Modal
        centered
        footer={null}
        open={props.isVisible}
        onCancel={handleCancel}
        onOk={handleOk}
      >
        <AddMemeberForm />
      </Modal>
  );
};

export default AddMemeberModal;
