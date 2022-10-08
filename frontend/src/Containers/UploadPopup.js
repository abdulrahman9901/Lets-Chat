import { Modal } from 'antd';
import { Upload } from 'antd';
import ImgCrop from 'antd-img-crop';
import React, { useState } from 'react';

const UploadModal = (props) => {

  return (
    <>
      <Modal
       title="Basic Modal" 
       open={props.open} 
       onOk={props.cancel} 
       onCancel={props.cancel}
       centered
       footer={null}
       >
      </Modal>
    </>
  );
};

export default UploadModal;
