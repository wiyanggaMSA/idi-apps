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
    PlusOutlined,
} from "@ant-design/icons";

export const appMenu = [
    {
        key: "dashboard",
        label: "Dashboard",
        labelKey: "menu.dashboard",
        icon: <DashboardOutlined />,
        routeName: "dashboard",
    },
    //SECRETARIAT
    {
        key: "secretariat",
        label: "Sekretariat",
        labelKey: "menu.secretariat",
        icon: <FileTextOutlined />,
        children: [
            {
                key: "secretariat.board",
                label: "Board",
                labelKey: "menu.board",
                icon: <DashboardOutlined />,
                routeName: "secretariat.dashboard",
                permission: "secretariat.view",
            },
            {
                key: "secretariat.letters",
                label: "Surat",
                labelKey: "menu.letters",
                icon: <MailOutlined />,
                routeName: "secretariat.letters.index",
                permission: "letters.view",
            },
            {
                key: "secretariat.agenda",
                label: "Agenda",
                labelKey: "menu.agenda",
                icon: <CalendarOutlined />,
                routeName: "secretariat.agenda.index",
                permission: "agenda.view",
            },
            {
                key: "secretariat.templates",
                label: "Template Surat",
                labelKey: "menu.templates",
                icon: <FilePdfOutlined />,
                routeName: "secretariat.templates.index",
                permission: "templates.manage",
            },
            {
                key: "secretariat.archive",
                label: "Arsip",
                labelKey: "menu.archive",
                icon: <FolderOpenOutlined />,
                routeName: "secretariat.archive.index",
                permission: "secretariat.view",
            },
        ],
    },
    //MEMBERS
    {
        key: "members",
        label: "Anggota",
        labelKey: "menu.members",
        icon: <TeamOutlined />,
        children: [
            {
                key: "members.center",
                label: "Data Anggota",
                labelKey: "menu.memberData",
                icon: <IdcardOutlined />,
                routeName: "members.index",
                Permission: "members.view",
            },
            {
                key: "members.import",
                label: "Import / Export",
                labelKey: "menu.importExport",
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
        labelKey: "menu.dues",
        icon: <DollarOutlined />,
        children: [
            {
                key: "dues.payments",
                label: "Pembayaran",
                labelKey: "menu.payments",
                icon: <CreditCardOutlined />,
                routeName: "dues.index",
            },
            {
                key: "dues.recap",
                label: "Rekap Iuran",
                labelKey: "menu.duesRecap",
                icon: <FileDoneOutlined />,
                routeName: "dues.recap",
            },
        ],
    },
    //CASH
    {
        key: "cash",
        label: "Kas / Transaksi",
        labelKey: "menu.cash",
        icon: <TransactionOutlined />,
        children: [
            {
                key: "cash.transactions",
                label: "Transaksi",
                labelKey: "menu.transactions",
                icon: <UnorderedListOutlined />,
                routeName: "transactions.index",
                permission: "transactions.view",
            },
        ],
    },
    //REPORTS
    {
        key: "reports",
        label: "Laporan",
        labelKey: "menu.reports",
        icon: <BarChartOutlined />,
        children: [
            {
                key: "reports.main",
                label: "Laporan Kas",
                labelKey: "menu.cashReport",
                icon: <FundOutlined />,
                routeName: "reports.cash",
                permission: "reports.cash.view",
            },
            {
                key: "reports.resume",
                label: "Resume Keuangan",
                labelKey: "menu.financialSummary",
                icon: <FileTextOutlined />,
                routeName: "reports.financial-summary",
                permission: "reports.summary.view",
            },
        ],
    },
    {
        key: "settings",
        label: "Pengaturan",
        labelKey: "menu.settings",
        icon: <SettingOutlined />,
        routeName: "settings.index",
        Permission: "settings.view",
    },
];
