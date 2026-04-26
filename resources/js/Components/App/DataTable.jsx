import React from "react";
import { Table } from "antd";
import EmptyState from "@/Components/App/EmptyState";

export default function DataTable({
    emptyTitle,
    emptyDescription,
    scroll,
    className = "",
    ...props
}) {
    return (
        <div className={className}>
            <Table
                scroll={scroll || { x: 960 }}
                locale={{
                    emptyText: (
                        <EmptyState
                            compact
                            title={emptyTitle}
                            description={emptyDescription}
                        />
                    ),
                }}
                {...props}
            />
        </div>
    );
}
