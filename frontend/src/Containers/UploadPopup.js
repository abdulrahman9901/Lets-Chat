import { Button, Modal ,Upload ,message} from 'antd';
import ImgCrop from 'antd-img-crop';
import React, { useState } from 'react';
import axios from 'axios';

const UploadModal = (props) => {

  const [fileList, setFileList] = useState([]);
  const [uploading, setUploading] = useState(false);
  
  const handleUpload = () => {
      const formData = new FormData();
      console.log("raw data " , fileList)
      fileList.forEach((file) => {
        formData.append('images', file);
      });
      console.log("uploaded files are :- ",formData)
      setUploading(true); // You can use any AJAX library you like
      
      axios.defaults.xsrfHeaderName = "X-CSRFTOKEN";
      axios.defaults.xsrfCookieName = "csrftoken";
      axios.defaults.headers = {
        "Content-Type": "multipart/form-data",
        Authorization :`Token ${props.token}`
      }
      axios.post('http://127.0.0.1:8000/chat/upload/',formData
            
          ).then(res=>{
            console.log(res)
          }).then(() => {
            setFileList([]);
            message.success('upload successfully.');})
            .catch(() => {
              message.error('upload failed.');
            })
            .finally(() => {
              setUploading(false);
              props.cancel()
            });
  };

  const uploadProps = {
    onRemove: (file) => {
      const index = fileList.indexOf(file);
      const newFileList = fileList.slice();
      newFileList.splice(index, 1);
      setFileList(newFileList);
    },
    beforeUpload: (file) => {
      setFileList([...fileList, file]);
      return false;
    },
    onPreview : async (file) => {
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
      },
    fileList,
  };

  
  return (
    <>
      <Modal
       title="Upload to chat" 
       open={props.open} 
       onOk={props.cancel} 
       onCancel={props.cancel}
       centered
       footer={null}
       >
    {/* <ImgCrop rotate> */}
      <Upload
        {...uploadProps}
        listType="picture-card"
        // fileList={fileList}
        // crossOrigin={'credentials'}
         //onChange={handleChange}
         //onPreview={onPreview}
        // enctype="multipart/form-data"
      >
        {fileList.length < 5 && '+ Upload'}
      </Upload>
    {/* </ImgCrop> */}
    <Button
        type="primary"
        onClick={handleUpload}
        disabled={fileList.length === 0}
        loading={uploading}
        style={{
          marginTop: 16,
        }}
      >
        {uploading ? 'Uploading' : 'Start Upload'}
      </Button>
      </Modal>
    </>
  );
};

export default UploadModal;
