import React from "react";
import {
    DashboardOutlined,
    FileTextOutlined,
    TeamOutlined,
    DollarOutlined,
    CreditCardOutlined,
    FileDoneOutlined,
    TransactionOutlined,
    BarChartOutlined,
    SettingOutlined,
    MailOutlined,
    CalendarOutlined,
    FolderOpenOutlined,
    IdcardOutlined,
    ImportOutlined,
    UnorderedListOutlined,
    FilePdfOutlined,
    FundOutlined,
} from "@ant-design/icons";

export const appMenu = [
    {
        key: "dashboard",
        label: "Dashboard",
        icon: <DashboardOutlined />,
        routeName: "dashboard",
    },
    //SECRETARIAT
    {
        key: "secretariat",
        label: "Sekretariat",
        icon: <FileTextOutlined />,
        children: [
            {
                key: "secretariat.letters",
                label: "Surat",
                icon: <MailOutlined />,
                routeName: "secretariat.index",
            },
            {
                key: "secretariat.agenda",
                label: "Agenda",
                icon: <CalendarOutlined />,
                routeName: "secretariat.agenda",
            },
            {
                key: "secretariat.archive",
                label: "Arsip",
                icon: <FolderOpenOutlined />,
                routeName: "secretariat.archive",
            },
        ],
    },
    //MEMBERS
    {
        key: "members",
        label: "Anggota",
        icon: <TeamOutlined />,
        children: [
            {
                key: "members.center",
                label: "Data Anggota",
                icon: <IdcardOutlined />,
                routeName: "members.index",
                Permission: "members.view",
            },
            {
                key: "members.import",
                label: "Import / Export",
                icon: <ImportOutlined />,
                routeName: "members.import-export",
                Permission: "members.import",
            },
        ],
    },
    //DUES
    {
        key: "dues",
        label: "Iuran",
        icon: <DollarOutlined />,
        children: [
            {
                key: "dues.payments",
                label: "Pembayaran & Status",
                icon: <CreditCardOutlined />,
                routeName: "dues.index",
            },
            {
                key: "dues.recap",
                label: "Rekap Iuran",
                icon: <FileDoneOutlined />,
                routeName: "dues.recap",
            },
        ],
    },
    //CASH
    {
        key: "cash",
        label: "Kas / Transaksi",
        icon: <TransactionOutlined />,
        children: [
            {
                key: "cash.transactions",
                label: "Transaksi",
                icon: <UnorderedListOutlined />,
                routeName: "cash.index",
            },
            {
                key: "cash.reports",
                label: "Laporan Kas & Iuran",
                icon: <BarChartOutlined />,
                routeName: "cash.reports",
            },
            {
                key: "cash.export",
                label: "Resume & Export PDF",
                icon: <FilePdfOutlined />,
                routeName: "cash.export",
            },
        ],
    },
    //REPORTS
    {
        key: "reports",
        label: "Laporan",
        icon: <BarChartOutlined />,
        children: [
            {
                key: "reports.main",
                label: "Laporan Iuran & Kas",
                icon: <FundOutlined />,
                routeName: "reports.index",
            },
            {
                key: "reports.resume",
                label: "Resume Keuangan",
                icon: <FileTextOutlined />,
                routeName: "reports.resume",
            },
            {
                key: "reports.export",
                label: "Export PDF",
                icon: <FilePdfOutlined />,
                routeName: "reports.export",
            },
        ],
    },
    {
        key: "settings",
        label: "Pengaturan",
        icon: <SettingOutlined />,
        routeName: "settings.index",
        Permission: "settings.view",
    },
];
