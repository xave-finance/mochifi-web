use cosmwasm_std::{
    log, to_binary, Api, BankMsg, Binary, Coin, CosmosMsg, Env, Extern, HandleResponse, HumanAddr,
    InitResponse, Querier, StdError, StdResult, Storage,
};

use crate::msg::{
    FamilyResponse, GuardianResponse, HandleMsg, InitMsg, OwnerResponse, QueryMsg,
    RecoveryResponse, SignerResponse,
};
use crate::state::{config, config_read, State};

pub fn init<S: Storage, A: Api, Q: Querier>(
    deps: &mut Extern<S, A, Q>,
    env: Env,
    _msg: InitMsg,
) -> StdResult<InitResponse> {
    let state = State {
        owner: deps.api.canonical_address(&env.message.sender)?,
        guardians_pending: vec![],
        guardians: vec![],
        is_recovering: false,
        recovery_address: deps.api.canonical_address(&env.message.sender)?,
        recovery_signitures: vec![],
        family_members: vec![],
    };

    config(&mut deps.storage).save(&state)?;

    Ok(InitResponse::default())
}

pub fn handle<S: Storage, A: Api, Q: Querier>(
    deps: &mut Extern<S, A, Q>,
    env: Env,
    msg: HandleMsg,
) -> StdResult<HandleResponse> {
    match msg {
        HandleMsg::AddGuardian { guardian } => try_add_guardian(deps, env, guardian),
        HandleMsg::RemoveGuardian { guardian } => try_remove_guardian(deps, env, guardian),
        HandleMsg::ExecuteRecovery {
            new_owner,
            guardian,
        } => try_execute_recovery(deps, env, new_owner, guardian),
        HandleMsg::CancelRecovery { guardian } => try_cancel_recovery(deps, env, guardian),
        HandleMsg::GuardianApproveRequest { guardian } => {
            try_guardian_approve_request(deps, env, guardian)
        }
        HandleMsg::SendTokens { to_address, amount } => try_send(deps, env, to_address, amount),
        HandleMsg::AddGuardianConfirm { guardian } => try_add_guardian_confirm(deps, env, guardian),
        HandleMsg::AddGuardianConfirmCancel { guardian } => {
            try_add_guardian_confirm_cancel(deps, env, guardian)
        }
        HandleMsg::AddFamilyMember { family_member } => {
            try_add_family_member(deps, env, family_member)
        }
        HandleMsg::RemoveFamilyMember { family_member } => {
            try_remove_family_member(deps, env, family_member)
        }
    }
}

pub fn try_add_family_member<S: Storage, A: Api, Q: Querier>(
    deps: &mut Extern<S, A, Q>,
    env: Env,
    family_member: String,
) -> StdResult<HandleResponse> {
    let api = deps.api;
    // trigger update state
    config(&mut deps.storage).update(|mut state| {
        // Check if the sender is the owner of the contract
        if api.canonical_address(&env.message.sender)? != state.owner {
            return Err(StdError::unauthorized());
        }
        // clone family members
        let mut family_members_list = state.family_members.clone();

        // check if guardian is already added
        if family_members_list.contains(&family_member) == true {
            return Err(StdError::generic_err("family member already added"));
        }
        // push guardian canonical address for confirmation
        family_members_list.push(family_member.clone());
        // set state to new vector
        state.family_members = family_members_list;

        Ok(state)
    })?;
    // emit event add_guardian
    Ok(HandleResponse {
        log: vec![
            log("action", "add_family_member"),
            log("guard_for", family_member.as_str()),
        ],
        ..HandleResponse::default()
    })
}

pub fn try_remove_family_member<S: Storage, A: Api, Q: Querier>(
    deps: &mut Extern<S, A, Q>,
    env: Env,
    family_member: String,
) -> StdResult<HandleResponse> {
    let api = deps.api;
    // trigger update state
    config(&mut deps.storage).update(|mut state| {
        // Check if the sender is the owner of the contract
        if api.canonical_address(&env.message.sender)? != state.owner {
            return Err(StdError::unauthorized());
        }
        // clone family members
        let mut family_members_list = state.family_members.clone();
        // convert HumanAddr to CanonicalAddr
        // Remove address in cloned vector
        family_members_list.retain(|x| x != &family_member);
        // Set it as new state
        state.family_members = family_members_list;

        Ok(state)
    })?;
    // emit event add_guardian
    Ok(HandleResponse {
        log: vec![
            log("action", "remove_family_member"),
            log("family_member", family_member.as_str()),
        ],
        ..HandleResponse::default()
    })
}

pub fn try_add_guardian<S: Storage, A: Api, Q: Querier>(
    deps: &mut Extern<S, A, Q>,
    env: Env,
    guardian: String,
) -> StdResult<HandleResponse> {
    let api = deps.api;
    // trigger update state
    config(&mut deps.storage).update(|mut state| {
        // Check if the sender is the owner of the contract
        if api.canonical_address(&env.message.sender)? != state.owner {
            return Err(StdError::unauthorized());
        }
        // clone guardians list and pending list
        let guardians_list = state.guardians.clone();
        let mut pending_guardians_list = state.guardians_pending.clone();
        // check if guardian is already added
        if guardians_list.contains(&guardian) == true {
            return Err(StdError::generic_err("guardian addition pending"));
        }
        // check if the guardian is in the pending list
        if pending_guardians_list.contains(&guardian) == true {
            return Err(StdError::generic_err("guardian already added"));
        }
        // push guardian canonical address for confirmation
        pending_guardians_list.push(guardian.clone());
        // set state to new vector
        state.guardians_pending = pending_guardians_list;

        Ok(state)
    })?;
    // emit event add_guardian
    Ok(HandleResponse {
        log: vec![
            log("action", "add_guardian_request"),
            log("guardian", guardian),
        ],
        ..HandleResponse::default()
    })
}

pub fn try_add_guardian_confirm<S: Storage, A: Api, Q: Querier>(
    deps: &mut Extern<S, A, Q>,
    env: Env,
    guardian: String,
) -> StdResult<HandleResponse> {
    // trigger update state
    config(&mut deps.storage).update(|mut state| {
        // clone guardians list and pending list
        let mut guardians_list = state.guardians.clone();
        let mut pending_guardians_list = state.guardians_pending.clone();
        // check if the guardian is in the pending list
        if pending_guardians_list.contains(&guardian.to_string()) == false {
            return Err(StdError::generic_err("guardian not in the pending list"));
        }
        // remove guardian in pending
        pending_guardians_list.retain(|x| x != &guardian);

        // push guardian canonical address for confirmation
        guardians_list.push(guardian);
        // set state to new vector
        state.guardians = guardians_list;
        state.guardians_pending = pending_guardians_list;

        Ok(state)
    })?;
    // emit event add_guardian
    Ok(HandleResponse {
        log: vec![
            log("action", "add_guardian_confirm"),
            log("guardian", &env.message.sender.as_str()),
        ],
        ..HandleResponse::default()
    })
}

pub fn try_add_guardian_confirm_cancel<S: Storage, A: Api, Q: Querier>(
    deps: &mut Extern<S, A, Q>,
    env: Env,
    guardian: String,
) -> StdResult<HandleResponse> {
    let api = deps.api;
    // trigger update state
    config(&mut deps.storage).update(|mut state| {
        // Check if the sender is the owner of the contract
        if api.canonical_address(&env.message.sender)? != state.owner {
            return Err(StdError::unauthorized());
        }
        // clone pending list
        let mut pending_guardians_list = state.guardians_pending.clone();
        // check if the guardian is in the pending list
        if pending_guardians_list.contains(&guardian) == false {
            return Err(StdError::generic_err("guardian not in the pending list"));
        }
        // remove guardian in pending
        pending_guardians_list.retain(|x| x != &guardian);
        // set state to new vector
        state.guardians_pending = pending_guardians_list;

        Ok(state)
    })?;
    // emit event add_guardian
    Ok(HandleResponse {
        log: vec![
            log("action", "cancel_guardian_request"),
            log("guardian", &env.message.sender.as_str()),
        ],
        ..HandleResponse::default()
    })
}

pub fn try_remove_guardian<S: Storage, A: Api, Q: Querier>(
    deps: &mut Extern<S, A, Q>,
    env: Env,
    guardian: String,
) -> StdResult<HandleResponse> {
    let api = deps.api;
    config(&mut deps.storage).update(|mut state| {
        if api.canonical_address(&env.message.sender)? != state.owner {
            return Err(StdError::unauthorized());
        }
        // clone guardians list
        let mut guardians_list = state.guardians.clone();

        // remove address in vector
        guardians_list.retain(|x| x != &guardian);
        // set state to new vector
        state.guardians = guardians_list;

        Ok(state)
    })?;
    // emit event
    Ok(HandleResponse {
        log: vec![
            log("action", "remove_guardian"),
            log("guardian", guardian.as_str()),
        ],
        ..HandleResponse::default()
    })
}

pub fn try_send<S: Storage, A: Api, Q: Querier>(
    deps: &mut Extern<S, A, Q>,
    env: Env,
    to_address: HumanAddr,
    amount: Vec<Coin>,
) -> StdResult<HandleResponse> {
    let api = deps.api;
    config(&mut deps.storage).update(|state| {
        // Check if owner
        if api.canonical_address(&env.message.sender)? != state.owner {
            return Err(StdError::unauthorized());
        }

        Ok(state)
    })?;
    // send process
    let r = HandleResponse {
        messages: vec![CosmosMsg::Bank(BankMsg::Send {
            from_address: env.contract.address.clone(),
            to_address: to_address.clone(),
            amount,
        })],

        log: vec![
            log("action", "send_tokens"),
            log("sender", &env.contract.address.as_str().to_string()),
            log("receiver", &to_address.as_str().to_string()),
        ],
        data: None,
    };
    Ok(r)
}

pub fn try_execute_recovery<S: Storage, A: Api, Q: Querier>(
    deps: &mut Extern<S, A, Q>,
    env: Env,
    new_owner: HumanAddr,
    guardian: String,
) -> StdResult<HandleResponse> {
    let api = deps.api;
    config(&mut deps.storage).update(|mut state| {
        let guardians_list = state.guardians.clone();
        let mut signed_list = vec![];

        // check if sender is a guardian
        if guardians_list.contains(&guardian) == false {
            return Err(StdError::unauthorized());
        }

        if guardians_list.len() == 1 {
            // if only one guardian -- recover
            state.owner = api.canonical_address(&new_owner)?;
        } else {
            // guardian who triggered this action signs first
            signed_list.push(guardian);
            // change is_recovering to true
            state.is_recovering = true;
            state.recovery_address = api.canonical_address(&new_owner)?;
            state.recovery_signitures = signed_list;
        }

        Ok(state)
    })?;
    // emit event
    Ok(HandleResponse {
        log: vec![
            log("action", "execute_recovery"),
            log("sender", &env.message.sender.as_str()),
        ],
        ..HandleResponse::default()
    })
}

pub fn try_cancel_recovery<S: Storage, A: Api, Q: Querier>(
    deps: &mut Extern<S, A, Q>,
    env: Env,
    guardian: String,
) -> StdResult<HandleResponse> {
    let api = deps.api;
    config(&mut deps.storage).update(|mut state| {
        let guardians_list = state.guardians.clone();

        // Check if owner
        if api.canonical_address(&env.message.sender)? != state.owner {
            // check if sender is a guardian
            if guardians_list.contains(&guardian) == false {
                return Err(StdError::unauthorized());
            }
        }
        // change is_recovering to true
        state.is_recovering = false;
        // clear signatures if possible
        state.recovery_signitures = vec![];
        Ok(state)
    })?;
    // emit event
    Ok(HandleResponse {
        log: vec![
            log("action", "cancel_recovery"),
            log("sender", &env.message.sender.as_str()),
        ],
        ..HandleResponse::default()
    })
}

pub fn try_guardian_approve_request<S: Storage, A: Api, Q: Querier>(
    deps: &mut Extern<S, A, Q>,
    env: Env,
    guardian: String,
) -> StdResult<HandleResponse> {
    // trigger update state
    config(&mut deps.storage).update(|mut state| {
        let guardians_list = state.guardians.clone();
        let mut signatures_list = state.recovery_signitures.clone();
        let required_sigs = guardians_list.len() / 2;

        if state.is_recovering == false {
            return Err(StdError::generic_err("wallet is not recovering"));
        }

        if guardians_list.contains(&guardian) == false {
            return Err(StdError::unauthorized());
        }

        // Add signature to the signatures list
        // push guardian canonical address
        signatures_list.push(guardian);
        // set state to new vector
        state.recovery_signitures = signatures_list.clone();

        if signatures_list.len() > required_sigs {
            // if there is enough signatures change owner
            state.owner = state.recovery_address.clone();
            state.is_recovering = false;
            state.recovery_signitures = vec![];
        }

        Ok(state)
    })?;
    // emit event add_guardian
    Ok(HandleResponse {
        log: vec![
            log("action", "approve_request"),
            log("guardian", &env.message.sender.as_str()),
        ],
        ..HandleResponse::default()
    })
}

pub fn query<S: Storage, A: Api, Q: Querier>(
    deps: &Extern<S, A, Q>,
    msg: QueryMsg,
) -> StdResult<Binary> {
    match msg {
        QueryMsg::GetOwner {} => to_binary(&query_owner(deps)?),
        QueryMsg::GetRecoveryStatus {} => to_binary(&query_recovery_status(deps)?),
        QueryMsg::GetGuardians {} => to_binary(&query_guardians(deps)?),
        QueryMsg::GetSigners {} => to_binary(&query_recovery_signatures(deps)?),
        QueryMsg::GetPendingGuardians {} => to_binary(&query_pending_guardians(deps)?),
        QueryMsg::GetFamilyMembers {} => to_binary(&query_family_member(deps)?),
    }
}

fn query_owner<S: Storage, A: Api, Q: Querier>(deps: &Extern<S, A, Q>) -> StdResult<OwnerResponse> {
    let state = config_read(&deps.storage).load()?;
    Ok(OwnerResponse {
        owner: deps.api.human_address(&state.owner)?.as_str().to_string(),
    })
}

fn query_recovery_status<S: Storage, A: Api, Q: Querier>(
    deps: &Extern<S, A, Q>,
) -> StdResult<RecoveryResponse> {
    let state = config_read(&deps.storage).load()?;
    Ok(RecoveryResponse {
        is_recovering: state.is_recovering,
    })
}

fn query_guardians<S: Storage, A: Api, Q: Querier>(
    deps: &Extern<S, A, Q>,
) -> StdResult<GuardianResponse> {
    let state = config_read(&deps.storage).load()?;
    let guardians_list = state.guardians.clone();

    Ok(GuardianResponse {
        guardians: guardians_list,
    })
}

fn query_pending_guardians<S: Storage, A: Api, Q: Querier>(
    deps: &Extern<S, A, Q>,
) -> StdResult<GuardianResponse> {
    let state = config_read(&deps.storage).load()?;
    let guardians_list = state.guardians_pending.clone();

    Ok(GuardianResponse {
        guardians: guardians_list,
    })
}

fn query_recovery_signatures<S: Storage, A: Api, Q: Querier>(
    deps: &Extern<S, A, Q>,
) -> StdResult<SignerResponse> {
    let state = config_read(&deps.storage).load()?;
    let signatures_list = state.recovery_signitures.clone();

    Ok(SignerResponse {
        signers: signatures_list,
    })
}

fn query_family_member<S: Storage, A: Api, Q: Querier>(
    deps: &Extern<S, A, Q>,
) -> StdResult<FamilyResponse> {
    let state = config_read(&deps.storage).load()?;
    let family_members = state.family_members.clone();

    Ok(FamilyResponse {
        family_members: family_members,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use cosmwasm_std::testing::{mock_dependencies, mock_env};
    use cosmwasm_std::{coins, from_binary};

    #[test]
    fn proper_initialization() {
        let mut deps = mock_dependencies(20, &[]);

        let msg = InitMsg {};
        let env = mock_env("creator", &coins(1000, "earth"));

        // we can just call .unwrap() to assert this was a success
        let res = init(&mut deps, env, msg).unwrap();
        assert_eq!(0, res.messages.len());

        // it worked, let's query the state
        let res = query(&deps, QueryMsg::GetOwner {}).unwrap();
        let value: OwnerResponse = from_binary(&res).unwrap();
        assert_eq!("creator", value.owner.as_str());
    }

    #[test]
    fn add_guardian() {
        // 1 - Initialize wallet
        let mut deps = mock_dependencies(20, &[]);
        let msg = InitMsg {};
        let env = mock_env("creator", &coins(1000, "earth"));

        // 2 - Check if wallet initialization is successful
        let res = init(&mut deps, env, msg).unwrap();
        assert_eq!(0, res.messages.len());

        // 3 - add a guardian address to the contract
        let guardian_address = "guardian1".to_string();
        let env = mock_env("creator", &coins(2, "token"));
        let msg = HandleMsg::AddGuardian {
            guardian: guardian_address.clone(),
        };
        let _res = handle(&mut deps, env, msg).unwrap();

        // 4 - check if the guardian address is added in the pending list
        let res = query(&deps, QueryMsg::GetPendingGuardians {}).unwrap();
        let value: GuardianResponse = from_binary(&res).unwrap();
        assert_eq!(vec![guardian_address.clone()], value.guardians);
        assert_eq!(1, value.guardians.len());

        // 5 - confirm guardian addition
        let env = mock_env("guardian1", &coins(2, "token"));
        let msg = HandleMsg::AddGuardianConfirm {
            guardian: guardian_address.clone(),
        };
        let _res = handle(&mut deps, env, msg).unwrap();

        // 6 - check if confirm is successful
        let res = query(&deps, QueryMsg::GetGuardians {}).unwrap();
        let value: GuardianResponse = from_binary(&res).unwrap();
        assert_eq!(vec![guardian_address.clone()], value.guardians);
        assert_eq!(1, value.guardians.len());

        // 7 - check if the guardian is deleted in the pending state
        let res = query(&deps, QueryMsg::GetPendingGuardians {}).unwrap();
        let value: GuardianResponse = from_binary(&res).unwrap();
        assert_eq!(0, value.guardians.len());
    }
    #[test]
    fn cancel_add_guardian() {
        // 1 - Initialize wallet
        let mut deps = mock_dependencies(20, &[]);
        let msg = InitMsg {};
        let env = mock_env("creator", &coins(1000, "earth"));

        // 2 - Check if wallet initialization is successful
        let res = init(&mut deps, env, msg).unwrap();
        assert_eq!(0, res.messages.len());

        // 3 - add a guardian address to the contract
        let guardian_address = "guardian1".to_string();
        let env = mock_env("creator", &coins(2, "token"));
        let msg = HandleMsg::AddGuardian {
            guardian: guardian_address.clone(),
        };
        let _res = handle(&mut deps, env, msg).unwrap();

        // 4 - check if the guardian address is added in the pending list
        let res = query(&deps, QueryMsg::GetPendingGuardians {}).unwrap();
        let value: GuardianResponse = from_binary(&res).unwrap();
        assert_eq!(vec![guardian_address.clone()], value.guardians);
        assert_eq!(1, value.guardians.len());

        // 5 - cancel guardian addition
        let env = mock_env("creator", &coins(2, "token"));
        let msg = HandleMsg::AddGuardianConfirmCancel {
            guardian: guardian_address.clone(),
        };
        let _res = handle(&mut deps, env, msg).unwrap();

        // 7 - check if the guardian is deletedd in the pending state
        let res = query(&deps, QueryMsg::GetPendingGuardians {}).unwrap();
        let value: GuardianResponse = from_binary(&res).unwrap();
        assert_eq!(0, value.guardians.len());
    }

    #[test]
    fn remove_guardian() {
        // 1 - Initialize wallet
        let mut deps = mock_dependencies(20, &[]);
        let msg = InitMsg {};
        let env = mock_env("creator", &coins(1000, "earth"));

        // 2 - Check if wallet initialization is successful
        let res = init(&mut deps, env, msg).unwrap();
        assert_eq!(0, res.messages.len());

        // 3 - add a guardian address to the contract
        let guardian_address = "guardian1".to_string();
        let env = mock_env("creator", &coins(2, "token"));
        let msg = HandleMsg::AddGuardian {
            guardian: guardian_address.clone(),
        };
        let _res = handle(&mut deps, env, msg).unwrap();

        // 4 - check if the guardian address is added in the pending list
        let res = query(&deps, QueryMsg::GetPendingGuardians {}).unwrap();
        let value: GuardianResponse = from_binary(&res).unwrap();
        assert_eq!(vec![guardian_address.clone()], value.guardians);
        assert_eq!(1, value.guardians.len());
        // 5 - confirm guardian addition
        let env = mock_env("guardian1", &coins(2, "token"));
        let msg = HandleMsg::AddGuardianConfirm {
            guardian: guardian_address.clone(),
        };
        let _res = handle(&mut deps, env, msg).unwrap();

        // 6 - check if confirm is successful
        let res = query(&deps, QueryMsg::GetGuardians {}).unwrap();
        let value: GuardianResponse = from_binary(&res).unwrap();
        assert_eq!(vec![guardian_address.clone()], value.guardians);
        assert_eq!(1, value.guardians.len());

        // 7 - check if the guardian is deletedd in the pending state
        let res = query(&deps, QueryMsg::GetPendingGuardians {}).unwrap();
        let value: GuardianResponse = from_binary(&res).unwrap();
        assert_eq!(0, value.guardians.len());

        // 8 - remove a guardian address to the contract
        let env = mock_env("creator", &coins(2, "token"));
        let msg = HandleMsg::RemoveGuardian {
            guardian: guardian_address.clone(),
        };
        let _res = handle(&mut deps, env, msg).unwrap();

        // 9- verify if the guardian address is removed
        let res = query(&deps, QueryMsg::GetGuardians {}).unwrap();
        let value: GuardianResponse = from_binary(&res).unwrap();
        assert_eq!(0, value.guardians.len());
    }

    #[test]
    fn execute_recovery() {
        // 1 - Initialize wallet
        let mut deps = mock_dependencies(20, &[]);
        let msg = InitMsg {};
        let env = mock_env("creator", &coins(1000, "earth"));

        // 2 - Check if wallet initialization is successful
        let res = init(&mut deps, env, msg).unwrap();
        assert_eq!(0, res.messages.len());

        // 3 - add a guardian address to the contract
        let guardian_address = "guardian1".to_string();
        let env = mock_env("creator", &coins(2, "token"));
        let msg = HandleMsg::AddGuardian {
            guardian: guardian_address.clone(),
        };
        let _res = handle(&mut deps, env, msg).unwrap();

        // 4 - check if the guardian address is added in the pending list
        let res = query(&deps, QueryMsg::GetPendingGuardians {}).unwrap();
        let value: GuardianResponse = from_binary(&res).unwrap();
        assert_eq!(vec![guardian_address.clone()], value.guardians);
        assert_eq!(1, value.guardians.len());

        // 5 - confirm guardian addition
        let env = mock_env("guardian1", &coins(2, "token"));
        let msg = HandleMsg::AddGuardianConfirm {
            guardian: guardian_address.clone(),
        };
        let _res = handle(&mut deps, env, msg).unwrap();

        // 6 - check if confirm is successful
        let res = query(&deps, QueryMsg::GetGuardians {}).unwrap();
        let value: GuardianResponse = from_binary(&res).unwrap();
        assert_eq!(vec![guardian_address.clone()], value.guardians);
        assert_eq!(1, value.guardians.len());

        // 7 - check if the guardian is deletedd in the pending state
        let res = query(&deps, QueryMsg::GetPendingGuardians {}).unwrap();
        let value: GuardianResponse = from_binary(&res).unwrap();
        assert_eq!(0, value.guardians.len());
        // 8 - add a guardian address to the contract
        let guardian_address = "guardian2".to_string();
        let env = mock_env("creator", &coins(2, "token"));
        let msg = HandleMsg::AddGuardian {
            guardian: guardian_address.clone(),
        };
        let _res = handle(&mut deps, env, msg).unwrap();

        // 9 - check if the guardian address is added in the pending list
        let res = query(&deps, QueryMsg::GetPendingGuardians {}).unwrap();
        let value: GuardianResponse = from_binary(&res).unwrap();
        assert_eq!(vec![guardian_address.clone()], value.guardians);
        assert_eq!(1, value.guardians.len());

        // 10 - confirm guardian addition
        let env = mock_env("guardian2", &coins(2, "token"));
        let msg = HandleMsg::AddGuardianConfirm {
            guardian: guardian_address.clone(),
        };
        let _res = handle(&mut deps, env, msg).unwrap();

        //11 - check if confirm is successful
        let res = query(&deps, QueryMsg::GetGuardians {}).unwrap();
        let value: GuardianResponse = from_binary(&res).unwrap();
        assert_eq!(vec!["guardian1", "guardian2"], value.guardians);
        assert_eq!(2, value.guardians.len());

        // 12 - check if the guardian is deletedd in the pending state
        let res = query(&deps, QueryMsg::GetPendingGuardians {}).unwrap();
        let value: GuardianResponse = from_binary(&res).unwrap();
        assert_eq!(0, value.guardians.len());

        // 13 - execute recovery transaction
        let env = mock_env("guardian1", &coins(2, "token"));
        let new_owner = HumanAddr::from("owner2");
        let msg = HandleMsg::ExecuteRecovery {
            new_owner: new_owner.clone(),
            guardian: guardian_address.clone(),
        };
        let _res = handle(&mut deps, env, msg).unwrap();

        // 14 - check if recovery status is true
        let res = query(&deps, QueryMsg::GetRecoveryStatus {}).unwrap();
        let value: RecoveryResponse = from_binary(&res).unwrap();
        assert_eq!(true, value.is_recovering)
    }

    #[test]
    fn cancel_recovery() {
        // 1 - Initialize wallet
        let mut deps = mock_dependencies(20, &[]);
        let msg = InitMsg {};
        let env = mock_env("creator", &coins(1000, "earth"));

        // 2 - Check if wallet initialization is successful
        let res = init(&mut deps, env, msg).unwrap();
        assert_eq!(0, res.messages.len());
        // 3 - add a guardian address to the contract
        let guardian_address = "guardian1".to_string();
        let env = mock_env("creator", &coins(2, "token"));
        let msg = HandleMsg::AddGuardian {
            guardian: guardian_address.clone(),
        };
        let _res = handle(&mut deps, env, msg).unwrap();

        // 4 - check if the guardian address is added in the pending list
        let res = query(&deps, QueryMsg::GetPendingGuardians {}).unwrap();
        let value: GuardianResponse = from_binary(&res).unwrap();
        assert_eq!(vec![guardian_address.clone()], value.guardians);
        assert_eq!(1, value.guardians.len());

        // 5 - confirm guardian addition
        let env = mock_env("guardian1", &coins(2, "token"));
        let msg = HandleMsg::AddGuardianConfirm {
            guardian: guardian_address.clone(),
        };
        let _res = handle(&mut deps, env, msg).unwrap();

        // 6 - check if confirm is successful
        let res = query(&deps, QueryMsg::GetGuardians {}).unwrap();
        let value: GuardianResponse = from_binary(&res).unwrap();
        assert_eq!(vec![guardian_address.clone()], value.guardians);
        assert_eq!(1, value.guardians.len());

        // 7 - check if the guardian is deletedd in the pending state
        let res = query(&deps, QueryMsg::GetPendingGuardians {}).unwrap();
        let value: GuardianResponse = from_binary(&res).unwrap();
        assert_eq!(0, value.guardians.len());

        // 8 - add a guardian address to the contract
        let guardian_address = "guardian2".to_string();
        let env = mock_env("creator", &coins(2, "token"));
        let msg = HandleMsg::AddGuardian {
            guardian: guardian_address.clone(),
        };
        let _res = handle(&mut deps, env, msg).unwrap();

        // 9 - check if the guardian address is added in the pending list
        let res = query(&deps, QueryMsg::GetPendingGuardians {}).unwrap();
        let value: GuardianResponse = from_binary(&res).unwrap();
        assert_eq!(vec![guardian_address.clone()], value.guardians);
        assert_eq!(1, value.guardians.len());

        // 10 - confirm guardian addition
        let env = mock_env("guardian2", &coins(2, "token"));
        let msg = HandleMsg::AddGuardianConfirm {
            guardian: guardian_address.clone(),
        };
        let _res = handle(&mut deps, env, msg).unwrap();

        //11 - check if confirm is successful
        let res = query(&deps, QueryMsg::GetGuardians {}).unwrap();
        let value: GuardianResponse = from_binary(&res).unwrap();
        assert_eq!(vec!["guardian1", "guardian2"], value.guardians);
        assert_eq!(2, value.guardians.len());

        // 12 - check if the guardian is deletedd in the pending state
        let res = query(&deps, QueryMsg::GetPendingGuardians {}).unwrap();
        let value: GuardianResponse = from_binary(&res).unwrap();
        assert_eq!(0, value.guardians.len());

        // 13 - execute recovery transaction
        let env = mock_env("guardian1", &coins(2, "token"));
        let new_owner = HumanAddr::from("owner2");
        let msg = HandleMsg::ExecuteRecovery {
            new_owner: new_owner.clone(),
            guardian: guardian_address.clone(),
        };
        let _res = handle(&mut deps, env, msg).unwrap();

        // 14 - check if recovery status is true
        let res = query(&deps, QueryMsg::GetRecoveryStatus {}).unwrap();
        let value: RecoveryResponse = from_binary(&res).unwrap();
        assert_eq!(true, value.is_recovering);

        // 15 - execute cance; recovery transaction
        let env = mock_env("guardian1", &coins(2, "token"));
        let msg = HandleMsg::CancelRecovery {
            guardian: guardian_address.clone(),
        };
        let _res = handle(&mut deps, env, msg).unwrap();

        // 16 - check if recovery status is false
        let res = query(&deps, QueryMsg::GetRecoveryStatus {}).unwrap();
        let value: RecoveryResponse = from_binary(&res).unwrap();
        assert_eq!(false, value.is_recovering);
    }

    #[test]
    fn guardian_sign() {
        // 1 - Initialize wallet
        let mut deps = mock_dependencies(20, &[]);
        let msg = InitMsg {};
        let env = mock_env("creator", &coins(1000, "earth"));

        // 2 - Check if wallet initialization is successful
        let res = init(&mut deps, env, msg).unwrap();
        assert_eq!(0, res.messages.len());
        // 3 - add a guardian address to the contract
        let guardian_address = "guardian1".to_string();
        let env = mock_env("creator", &coins(2, "token"));
        let msg = HandleMsg::AddGuardian {
            guardian: guardian_address.clone(),
        };
        let _res = handle(&mut deps, env, msg).unwrap();

        // 4 - check if the guardian address is added in the pending list
        let res = query(&deps, QueryMsg::GetPendingGuardians {}).unwrap();
        let value: GuardianResponse = from_binary(&res).unwrap();
        assert_eq!(vec![guardian_address.clone()], value.guardians);
        assert_eq!(1, value.guardians.len());

        // 5 - confirm guardian addition
        let env = mock_env("guardian1", &coins(2, "token"));
        let msg = HandleMsg::AddGuardianConfirm {
            guardian: guardian_address.clone(),
        };
        let _res = handle(&mut deps, env, msg).unwrap();

        // 6 - check if confirm is successful
        let res = query(&deps, QueryMsg::GetGuardians {}).unwrap();
        let value: GuardianResponse = from_binary(&res).unwrap();
        assert_eq!(vec![guardian_address.clone()], value.guardians);
        assert_eq!(1, value.guardians.len());

        // 7 - check if the guardian is deletedd in the pending state
        let res = query(&deps, QueryMsg::GetPendingGuardians {}).unwrap();
        let value: GuardianResponse = from_binary(&res).unwrap();
        assert_eq!(0, value.guardians.len());

        // 8 - add a guardian address to the contract
        let guardian_address = "guardian2".to_string();
        let env = mock_env("creator", &coins(2, "token"));
        let msg = HandleMsg::AddGuardian {
            guardian: guardian_address.clone(),
        };
        let _res = handle(&mut deps, env, msg).unwrap();

        // 9 - check if the guardian address is added in the pending list
        let res = query(&deps, QueryMsg::GetPendingGuardians {}).unwrap();
        let value: GuardianResponse = from_binary(&res).unwrap();
        assert_eq!(vec![guardian_address.clone()], value.guardians);
        assert_eq!(1, value.guardians.len());

        // 10 - confirm guardian addition
        let env = mock_env("guardian2", &coins(2, "token"));
        let msg = HandleMsg::AddGuardianConfirm {
            guardian: guardian_address.clone(),
        };
        let _res = handle(&mut deps, env, msg).unwrap();

        //11 - check if confirm is successful
        let res = query(&deps, QueryMsg::GetGuardians {}).unwrap();
        let value: GuardianResponse = from_binary(&res).unwrap();
        assert_eq!(vec!["guardian1", "guardian2"], value.guardians);
        assert_eq!(2, value.guardians.len());

        // 12 - check if the guardian is deletedd in the pending state
        let res = query(&deps, QueryMsg::GetPendingGuardians {}).unwrap();
        let value: GuardianResponse = from_binary(&res).unwrap();
        assert_eq!(0, value.guardians.len());

        // 13 - execute recovery transaction
        let env = mock_env("guardian1", &coins(2, "token"));
        let new_owner = HumanAddr::from("owner2");
        let msg = HandleMsg::ExecuteRecovery {
            new_owner: new_owner.clone(),
            guardian: guardian_address.clone(),
        };
        let _res = handle(&mut deps, env, msg).unwrap();

        // 14 - check if recovery status is true
        let res = query(&deps, QueryMsg::GetRecoveryStatus {}).unwrap();
        let value: RecoveryResponse = from_binary(&res).unwrap();
        assert_eq!(true, value.is_recovering);

        // 15 - add signature
        let env = mock_env("guardian2", &coins(2, "token"));
        let msg = HandleMsg::GuardianApproveRequest {
            guardian: guardian_address.clone(),
        };
        let _res = handle(&mut deps, env, msg).unwrap();

        // 16 - check if signers are cleared
        let res = query(&deps, QueryMsg::GetSigners {}).unwrap();
        let value: SignerResponse = from_binary(&res).unwrap();
        assert_eq!(0, value.signers.len());

        // 14 - check if recovery status is  false
        let res = query(&deps, QueryMsg::GetRecoveryStatus {}).unwrap();
        let value: RecoveryResponse = from_binary(&res).unwrap();
        assert_eq!(false, value.is_recovering);
    }

    #[test]
    fn add_family_member() {
        // 1 - Initialize wallet
        let mut deps = mock_dependencies(20, &[]);
        let msg = InitMsg {};
        let env = mock_env("creator", &coins(1000, "earth"));

        // 2 - Check if wallet initialization is successful
        let res = init(&mut deps, env, msg).unwrap();
        assert_eq!(0, res.messages.len());

        // 3 - add a family member in your wallet
        let fam_address = "fam1".to_string();
        let env = mock_env("creator", &coins(2, "token"));
        let msg = HandleMsg::AddFamilyMember {
            family_member: fam_address.clone(),
        };
        let _res = handle(&mut deps, env, msg).unwrap();

        // 4 - check if the family member is added
        let res = query(&deps, QueryMsg::GetFamilyMembers {}).unwrap();
        let value: FamilyResponse = from_binary(&res).unwrap();
        assert_eq!(vec![fam_address], value.family_members);
        assert_eq!(1, value.family_members.len());
    }

    #[test]
    fn remove_family_member() {
        // 1 - Initialize wallet
        let mut deps = mock_dependencies(20, &[]);
        let msg = InitMsg {};
        let env = mock_env("creator", &coins(1000, "earth"));

        // 2 - Check if wallet initialization is successful
        let res = init(&mut deps, env, msg).unwrap();
        assert_eq!(0, res.messages.len());

        // 3 - add a family member in your wallet
        let fam_address = "fam1".to_string();
        let env = mock_env("creator", &coins(2, "token"));
        let msg = HandleMsg::AddFamilyMember {
            family_member: fam_address.clone(),
        };
        let _res = handle(&mut deps, env, msg).unwrap();

        // 4 - check if the family member is added
        let res = query(&deps, QueryMsg::GetFamilyMembers {}).unwrap();
        let value: FamilyResponse = from_binary(&res).unwrap();
        assert_eq!(vec![fam_address.clone()], value.family_members);
        assert_eq!(1, value.family_members.len());

        // 3 - remove a family member in your wallet
        let env = mock_env("creator", &coins(2, "token"));
        let msg = HandleMsg::RemoveFamilyMember {
            family_member: fam_address.clone(),
        };
        let _res = handle(&mut deps, env, msg).unwrap();

        // 4 - check if the family member is removed
        let res = query(&deps, QueryMsg::GetFamilyMembers {}).unwrap();
        let value: FamilyResponse = from_binary(&res).unwrap();
        assert_eq!(0, value.family_members.len());
    }
}
