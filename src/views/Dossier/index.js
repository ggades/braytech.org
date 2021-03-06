import React from 'react';
import { compose } from 'redux';
import { connect } from 'react-redux';
import { withNamespaces } from 'react-i18next';
import cx from 'classnames';
import Moment from 'react-moment';
import orderBy from 'lodash/orderBy';

import CharacterEmblem from '../../components/UI/CharacterEmblem';
import Item from '../../components/Item';
import manifest from '../../utils/manifest';
import * as utils from '../../utils/destinyUtils';
import getDossierMembers from '../../utils/getDossierMembers';
import * as ls from '../../utils/localStorage';
import ProfileSearch from './ProfileSearch';
import Spinner from '../../components/UI/Spinner';
import { enumerateCollectibleState } from '../../utils/destinyEnums';
import NotificationInline from '../../components/Notifications/NotificationInline';

import './styles.css';

class Dossier extends React.Component {
  constructor(props) {
    super(props);

    this.state = {};
  }

  componentDidMount() {
    this.loadProfiles();

    this.startInterval();
  }

  startInterval() {
    this.refreshProfilesInterval = window.setInterval(this.loadProfiles, 30000);
  }

  clearInterval() {
    window.clearInterval(this.refreshProfilesInterval);
  }

  componentWillUnmount() {
    this.clearInterval();
  }

  loadProfiles = () => {
    let stored = ls.get('dossier.profiles') || [];
    let profiles = stored.length > 0 ? stored : [
      {
        membershipType: this.props.member.membershipType,
        membershipId: this.props.member.membershipId,
        displayName: this.props.member.data.profile.profile.data.userInfo.displayName
      }
    ];

    getDossierMembers(profiles);
  };

  render() {
    const {viewport, member, dossierMembers } = this.props;

    return (
      <div className='view' id='dossier'>
        <div className='control'>
          {viewport.width < 1600 ? <NotificationInline type={`info`} name='Designed for desktops' description={`This view is intended for a minimum horizontal resolution of 1660 pixels`} /> : null}
          <div className='search'>
            <ProfileSearch onProfilesChange={this.loadProfiles} />
          </div>
        </div>
        <div className='members'>
          {dossierMembers.responses.length && dossierMembers.loading ? <Spinner mini /> : null}
          {dossierMembers.responses.length ? (
            dossierMembers.responses.map(d => {

              if (!d.profile || !d.historicalStats || d.error) {
                return (
                  <div key={d.membershipId} className={cx('member', { self: member.membershipType === d.membershipType && member.membershipId === d.membershipId })}>
                    <NotificationInline type={d.error === 'privacy' ? `info` : `error`} name={d.error === 'privacy' ? `Profile privacy` : `Profile failed to load`} description={d.error === 'privacy' ? `This player is hiding something 👀` : `Profile failed to load. This is a temporary error.`} />
                  </div>
                )
              }

              const characterId = d.profile.characters.data[0].characterId;
              const equipment = d.profile.characterEquipment.data[characterId].items;
              const itemComponents = d.profile.itemComponents;
              const characterCollectibles = d.profile.characterCollectibles.data;
              const profileCollectibles = d.profile.profileCollectibles.data;

              const enumerated = hash => {
                let state = 0;
                let scope = profileCollectibles.collectibles[hash] ? profileCollectibles.collectibles[hash] : characterCollectibles[characterId].collectibles[hash];
                if (scope) {
                  state = scope.state;
                }

                return enumerateCollectibleState(state);
              }

              let crucibleThreats = [
                // 4274523516, // Redrix's Claymore
                // 1111219481, // Redrix's Broadsword
                3260604718, // Luna's Howl
                3260604717, // Not Forgotten
                4047371119, // The Mountaintop
                2335550020, // The Recluse
              ];

              crucibleThreats = crucibleThreats.map(hash => {
                let def = manifest.DestinyCollectibleDefinition[hash];

                if (!enumerated(hash).notAcquired && !enumerated(hash).invisible) {
                  return (
                    <li key={hash}><span className='threat'>{def.displayProperties.name}</span></li>
                  )
                } else {
                  return false;
                }
              });

              const timePlayedTotalCharacters = Math.floor(
                Object.keys(d.profile.characters.data).reduce((sum, key) => {
                  return sum + parseInt(d.profile.characters.data[key].minutesPlayedTotal);
                }, 0) / 1440
              );
      
              let timePlayed = [];
              for (const [modeName, modeObject] of Object.entries(d.historicalStats)) {
                if (modeObject.allTime) {
                  let modeNamePretty = '';
                  if (modeName === 'allPvP') {
                    modeNamePretty = 'Crucible';
                  } else if (modeName === 'raid') {
                    modeNamePretty = 'Raids';
                  } else if (modeName === 'allPvECompetitive') {
                    modeNamePretty = 'Gambit';
                  } else {
                    modeNamePretty = 'Vanguard';
                  }
      
                  timePlayed.push({
                    secondsPlayed: modeObject.allTime.secondsPlayed.basic.value,
                    element: (
                      <li key={modeName}>
                        <ul>
                          <li>{modeNamePretty}</li>
                          <li>{Math.floor(modeObject.allTime.secondsPlayed.basic.value / 60 / 60)} hours</li>
                        </ul>
                      </li>
                    )
                  });
                }
              }

              timePlayed = orderBy(timePlayed, [stamp => stamp.secondsPlayed], ['desc']);

              let items = equipment.map(item => ({
                ...manifest.DestinyInventoryItemDefinition[item.itemHash],
                ...item
              }));

              const loadout = {
                subclass: {
                  ...items.find(item => item.inventory.bucketTypeHash === 3284755031),
                  info: utils.getSubclassPathInfo(d.profile, characterId)
                },
                kinetic: items.find(item => item.inventory.bucketTypeHash === 1498876634),
                energy: items.find(item => item.inventory.bucketTypeHash === 2465295065),
                power: items.find(item => item.inventory.bucketTypeHash === 953998645),
                ghost: items.find(item => item.inventory.bucketTypeHash === 4023194814),
                helmet: items.find(item => item.inventory.bucketTypeHash === 3448274439),
                gloves: items.find(item => item.inventory.bucketTypeHash === 3551918588),
                chest: items.find(item => item.inventory.bucketTypeHash === 14239492),
                legs: items.find(item => item.inventory.bucketTypeHash === 20886954),
                classItem: items.find(item => item.inventory.bucketTypeHash === 1585787867)
              };

              Object.entries(loadout).forEach(([key, value]) => {
                loadout[key].key = key;
                loadout[key].itemComponents = {
                  state: loadout[key].state,
                  instance: itemComponents.instances.data[loadout[key].itemInstanceId] ? itemComponents.instances.data[loadout[key].itemInstanceId] : false,
                  sockets: itemComponents.sockets.data[loadout[key].itemInstanceId] ? itemComponents.sockets.data[loadout[key].itemInstanceId].sockets : false,
                  perks: itemComponents.perks.data[loadout[key].itemInstanceId] ? itemComponents.perks.data[loadout[key].itemInstanceId].perks : false,
                  stats: itemComponents.stats.data[loadout[key].itemInstanceId] ? itemComponents.stats.data[loadout[key].itemInstanceId].stats : false
                };
              });

              const { lastPlayed, lastActivity, lastCharacter, lastMode, display } = utils.lastPlayerActivity(d);

              const valor = {
                defs: {
                  rank: manifest.DestinyProgressionDefinition[2626549951],
                  activity: manifest.DestinyActivityDefinition[2274172949]
                },
                progression: {
                  data: d.profile.characterProgressions.data[characterId].progressions[2626549951],
                  total: 0,
                  resets: d.profile.profileRecords.data.records[559943871] ? d.profile.profileRecords.data.records[559943871].objectives[0].progress : 0
                }
              };
          
              valor.progression.total = Object.keys(valor.defs.rank.steps).reduce((sum, key) => {
                return sum + valor.defs.rank.steps[key].progressTotal;
              }, 0);
          
              const glory = {
                defs: {
                  rank: manifest.DestinyProgressionDefinition[2000925172],
                  activity: manifest.DestinyActivityDefinition[2947109551]
                },
                progression: {
                  data: d.profile.characterProgressions.data[characterId].progressions[2000925172],
                  total: 0
                }
              };
          
              glory.progression.total = Object.keys(glory.defs.rank.steps).reduce((sum, key) => {
                return sum + glory.defs.rank.steps[key].progressTotal;
              }, 0);

              return (
                <div key={d.membershipId} className={cx('member', { self: member.membershipType === d.membershipType && member.membershipId === d.membershipId })}>
                  <CharacterEmblem profile={d.profile} characterId={characterId} responsive combat />
                  <div className='activity'>
                    {lastMode ? <div className='mode'>{lastMode.displayProperties.name}</div> : null}
                    {display ? <div className='name'>{display}</div> : <div className='name inactive'>Last seen</div>}
                    <Moment fromNow>
                      {lastPlayed}
                    </Moment>
                  </div>
                  <ul className='list items'>
                    {Object.values(loadout).map(item => {
                      return (
                        <li key={item.itemInstanceId} className={cx({ 'is-subclass': item.inventory.bucketTypeHash === 3284755031 })}>
                          <Item data={{ itemHash: item.hash, itemInstanceId: item.itemInstanceId, itemState: item.state }} showMemberState />
                        </li>
                      );
                    })}
                  </ul>
                  <div className='highlights'>
                    <div className='d'>
                      <div className='n'>Subclass path</div>
                      <div className='v'>{loadout.subclass.info.name}</div>
                    </div>
                    <div className='d armour-stats'>
                      <div className='n'>Armour stats</div>
                      <div className='v'>
                        <div>
                          <div><span className='destiny-mobility' /></div>
                          <div>{d.profile.characters.data[0].stats[2996146975]}</div>
                        </div>
                        <div>
                          <div><span className='destiny-resilience' /></div>
                          <div>{d.profile.characters.data[0].stats[392767087]}</div>
                        </div>
                        <div>
                          <div><span className='destiny-recovery' /></div>
                          <div>{d.profile.characters.data[0].stats[1943323491]}</div>
                        </div>
                      </div>
                    </div>
                    <div className='d time-played'>
                      <div className='n'>Time played</div>
                      <div className='v'>
                        <ul>
                          <li>
                            <ul>
                              <li>All characters</li>
                              <li>{timePlayedTotalCharacters} days</li>
                            </ul>
                          </li>
                          {timePlayed.map(e => e.element)}
                        </ul>
                      </div>
                    </div>
                    <div className='d'>
                      <div className='n'>Triumph score</div>
                      <div className='v'>{d.profile.profileRecords.data.score}</div>
                    </div>
                    <div className='d'>
                      <div className='n'>Valor points</div>
                      <div className='v'>{valor.progression.data.currentProgress}/{valor.progression.total} ({valor.progression.resets} resets)</div>
                    </div>
                    <div className='d'>
                      <div className='n'>Glory points</div>
                      <div className='v'>{glory.progression.data.currentProgress}/{glory.progression.total}</div>
                    </div>
                    <div className='d crucible-threats'>
                      <div className='n'>Crucible threats</div>
                      <div className='v'>
                        <ul>{crucibleThreats.filter(e => e).length > 0 ? crucibleThreats.filter(e => e).map(e => e) : <li>No threats</li>}</ul>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <Spinner />
          )}
        </div>
      </div>
    );
  }
}

function mapStateToProps(state, ownProps) {
  return {
    viewport: state.viewport,
    member: state.member,
    dossierMembers: state.dossierMembers
  };
}

export default compose(
  connect(mapStateToProps),
  withNamespaces()
)(Dossier);
