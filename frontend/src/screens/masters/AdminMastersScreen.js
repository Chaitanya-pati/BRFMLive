import React from "react";
import TabbedMasterShell from "./TabbedMasterShell";
import UserManagementScreen from "../UserManagementScreen";
import BranchMasterScreen from "../BranchMasterScreen";

const fakeRoute = (params = {}) => ({ params });

export default function AdminMastersScreen({ navigation }) {
  const tabs = [
    {
      key: "users",
      label: "Users",
      render: (nav) => <UserManagementScreen navigation={nav} route={fakeRoute()} />,
    },
    {
      key: "branches",
      label: "Branches",
      render: (nav) => <BranchMasterScreen navigation={nav} route={fakeRoute()} />,
    },
  ];

  return <TabbedMasterShell navigation={navigation} title="Admin Masters" tabs={tabs} />;
}
