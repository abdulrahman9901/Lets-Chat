import { Button, Modal } from 'antd';
import { Upload } from 'antd';
import ImgCrop from 'antd-img-crop';
import React, { useState } from 'react';

const UploadModal = (props) => {

    const [fileList, setFileList] = useState([
        {
          uid: '-1',
          name: 'image.png',
          status: 'done',
          url: 'https://zos.alipayobjects.com/rmsportal/jkjgkEfvpUPVyRjUImniVslZfWPnJuuZ.png',
        },
      ]);
    
      const onChange = ({ fileList: newFileList }) => {
        setFileList(newFileList);
      };
    
      const onPreview = async (file) => {
        let src = file.url;
    
        if (!src) {
          src = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.readAsDataURL(file.originFileObj);
    
            reader.onload = () => resolve(reader.result);
          });
        }
    
        const image = new Image();
        image.src = src;
        const imgWindow = window.open(src);
        imgWindow?.document.write(image.outerHTML);
      };

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
    <ImgCrop rotate>
      <Upload
        action="http://127.0.0.1:8000/chat/upload/"
        listType="picture-card"
        fileList={fileList}
        crossOrigin={'credentials'}
        onChange={onChange}
        onPreview={onPreview}
      >
        {fileList.length < 5 && '+ Upload'}
      </Upload>
    </ImgCrop>
    {/* <Button type="primary" htmlType="submit" style={{marginLeft:'45%'}}>Send</Button> */}
      </Modal>
    </>
  );
};

export default UploadModal;
