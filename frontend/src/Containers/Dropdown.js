import { DownOutlined } from '@ant-design/icons';
import { Dropdown, Menu, Space } from 'antd';
import React from 'react';
import { connect } from 'react-redux';
import { logout } from '../features/auth';

const Dropmenu = (props) => (
  <Dropdown overlay={
  <Menu theme={'dark'}
  onClick={() => props.onLogout()}
  items={[
    {
      label: <a href="#">Logout</a>,
      key: '0',
    },
  ]}
/>}
trigger={['click']}
>
    <a onClick={(e) => e.preventDefault()}>
      <Space>
        <DownOutlined className="fa fa-chevron-down expand-button aria-hidden='true' " />
      </Space>
    </a>
  </Dropdown>
);

const mapDispatchToProps = (dispatch) => ({
  onLogout: () => dispatch(logout()),
});

export default connect(null, mapDispatchToProps)(Dropmenu);
