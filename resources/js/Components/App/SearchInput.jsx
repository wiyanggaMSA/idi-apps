import React from "react";
import { Input } from "antd";
import { SearchOutlined } from "@ant-design/icons";

export default function SearchInput(props) {
    return (
        <Input
            prefix={<SearchOutlined className="text-zinc-400" />}
            allowClear
            className="idi-search-input"
            {...props}
        />
    );
}
