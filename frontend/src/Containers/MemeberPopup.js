import {Modal ,Button } from 'antd';
import React, { useState } from 'react';
import KickMemeberForm from './KickMemeberForm';
import AddMemeberForm from './MemeberForm';
const AddMemeberModal = (props) => {

  console.log('at modal ',props)

  const handleCancel = () => {
    setTimeout(() => {
      props.close()
    }, 10);
  };
return (
      <Modal
        title={`${props.action} a Memeber `}
        centered
        footer={null}
        open={props.isVisible}
        onCancel={handleCancel}
      >
      {props.action === "Adding" ?
        <AddMemeberForm /> :
        <KickMemeberForm {...props}/>
      }
      </Modal>
  );
};

export default AddMemeberModal;
