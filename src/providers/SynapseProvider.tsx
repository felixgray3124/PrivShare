"use client";

import {
  Synapse,
  WarmStorageService,
} from "@filoz/synapse-sdk";
import { createContext, useState, useEffect, useContext } from "react";
import { useEthersSigner } from "../hooks/useEthers";
import { config } from "../config";

export const SynapseContext = createContext<{
  synapse: Synapse | null;
  warmStorageService: WarmStorageService | null;
}>({ synapse: null, warmStorageService: null });

export const SynapseProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [synapse, setSynapse] = useState<Synapse | null>(null);
  const [warmStorageService, setWarmStorageService] =
    useState<WarmStorageService | null>(null);
  const signer = useEthersSigner();

  const createSynapse = async () => {
    try {
      // Only create Synapse if we have a signer (for upload operations)
      // Download operations don't need Synapse anymore
      if (signer) {
        console.log('Creating Synapse with signer for upload operations...');
        const synapse = await Synapse.create({
          signer,
          withCDN: config.withCDN,
          disableNonceManager: false,
        });

        const warmStorageService = await WarmStorageService.create(
          synapse.getProvider(),
          synapse.getWarmStorageAddress()
        );
        setSynapse(synapse);
        setWarmStorageService(warmStorageService);
        console.log('Synapse created successfully for upload operations');
      } else {
        console.log('No signer available, skipping Synapse creation (download-only mode)');
        // Don't create Synapse for download-only operations
        // Downloads now work without Synapse using direct provider access
      }
    } catch (error) {
      console.error('Failed to create Synapse instance:', error);
      // Don't throw error, just log it
      // The app can still work for downloads without Synapse
    }
  };
  
  useEffect(() => {
    createSynapse();
  }, [signer]);

  return (
    <SynapseContext.Provider value={{ synapse, warmStorageService }}>
      {children}
    </SynapseContext.Provider>
  );
};

export const useSynapse = () => {
  const { synapse, warmStorageService } = useContext(SynapseContext);
  return { synapse, warmStorageService };
};
