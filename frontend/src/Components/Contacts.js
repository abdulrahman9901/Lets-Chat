import React from "react";
import { NavLink } from "react-router-dom";
import { DownOutlined } from '@ant-design/icons';
import { Dropdown, Menu, Space ,Button,Icon } from 'antd';
import { stringify } from "rc-field-form/es/useWatch";

const Contact = props => (
  <NavLink to={`${props.chatURL}`} style={{ color: "#fff" }}>
    <li className="contact">
      <div className="wrap">
        <span className={`contact-status ${props.status}`} />
        <img src={props.picURL} alt="" />
        <div className="meta">
          <p className="name">{props.name}</p><p> You {props.members.length > 2 ? `and ${props.members.length - 1} others` : props.members.length > 1 ? `and ${props.members[1]}` : 'only'}
          {props.members.length > 2 ?
          <Dropdown overlay={
              <Menu
              theme="dark"
              items={
                props.members.map((m,indx) => {
                  if (indx)
                  return {
                    label: m,
                    key: stringify(indx),
                  }
                })
              }
            />
          }
          trigger={['click']}>
            <Button style={{paddingLeft: '10px' , paddingRight: '4px' , marginBottom: '10px'}}>
            <a onClick={(e) => e.preventDefault()}>
              <Space>
                  Show 
                <DownOutlined />
               </Space>
            </a> 
            </Button>
          </Dropdown> :null}
           </p>
        </div>
      </div>
    </li>
  </NavLink>
);

export default Contact;