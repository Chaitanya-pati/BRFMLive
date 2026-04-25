import React from "react";
import TabbedMasterShell from "./TabbedMasterShell";
import RawProductMasterScreen from "../RawProductMasterScreen";
import FinishedGoodsMasterScreen from "../FinishedGoodsMasterScreen";
import FinishedGoodsManagementScreen from "../FinishedGoodsManagementScreen";
import GranulationTemplateScreen from "../GranulationTemplateScreen";
import BagSizeMasterScreen from "../BagSizeMasterScreen";
import SiloMasterView from "../../components/SiloMasterView";

const fakeRoute = (params = {}) => ({ params });

export default function ProductionMastersScreen({ navigation }) {
  const tabs = [
    {
      key: "raw_products",
      label: "Production Order Products",
      render: (nav) => <RawProductMasterScreen navigation={nav} route={fakeRoute()} />,
    },
    {
      key: "finished_goods",
      label: "Finished Goods",
      render: (nav) => <FinishedGoodsMasterScreen navigation={nav} route={fakeRoute()} />,
    },
    {
      key: "fg_godown",
      label: "Finished Goods Godown",
      render: (nav) => <FinishedGoodsManagementScreen navigation={nav} route={fakeRoute()} />,
    },
    {
      key: "bag_sizes",
      label: "Bag Sizes",
      render: (nav) => <BagSizeMasterScreen navigation={nav} route={fakeRoute()} />,
    },
    {
      key: "granulation",
      label: "Granulation Template",
      render: (nav) => <GranulationTemplateScreen navigation={nav} route={fakeRoute()} />,
    },
    {
      key: "silo",
      label: "Silo Master",
      render: () => <SiloMasterView />,
    },
  ];

  return <TabbedMasterShell navigation={navigation} title="Production Masters" tabs={tabs} />;
}
