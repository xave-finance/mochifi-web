use cosmwasm_std::{Coin, HumanAddr};
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
pub struct InitMsg {}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
#[serde(rename_all = "snake_case")]
pub enum HandleMsg {
    AddGuardian {
        guardian: String,
    },
    RemoveGuardian {
        guardian: String,
    },
    AddGuardianConfirm {
        guardian: String,
    },
    AddGuardianConfirmCancel {
        guardian: String,
    },
    ExecuteRecovery {
        new_owner: HumanAddr,
        guardian: String,
    },
    CancelRecovery {
        guardian: String,
    },

    GuardianApproveRequest {
        guardian: String,
    },
    SendTokens {
        to_address: HumanAddr,
        amount: Vec<Coin>,
    },
    AddFamilyMember {
        family_member: String,
    },
    RemoveFamilyMember {
        family_member: String,
    },
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
#[serde(rename_all = "snake_case")]
pub enum QueryMsg {
    // GetCount returns the current count as a json-encoded number
    GetOwner {},
    GetRecoveryStatus {},
    GetGuardians {},
    GetSigners {},
    GetPendingGuardians {},
    GetFamilyMembers {},
}

// We define a custom struct for each query response
#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
pub struct OwnerResponse {
    pub owner: String,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
pub struct RecoveryResponse {
    pub is_recovering: bool,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
pub struct GuardianResponse {
    pub guardians: Vec<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
pub struct SignerResponse {
    pub signers: Vec<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
pub struct FamilyResponse {
    pub family_members: Vec<String>,
}
