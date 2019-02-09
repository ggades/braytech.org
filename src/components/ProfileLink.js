import React from 'react';
import { connect } from 'react-redux';
import { Link, NavLink } from 'react-router-dom';

function BuildProfileLink({ to, children, component, member, ...rest }) {
  const LinkComponent = component || Link;

  let memberPrefix = member.characterId ? `/${member.membershipType}/${member.membershipId}/${member.characterId}` : '';

  return (
    <LinkComponent to={{ pathname: `${memberPrefix}${to}` }}>
      {children}
    </LinkComponent>
  );
}

function mapStateToProps(state, ownProps) {
  return {
    member: state.member
  };
}

export const ProfileLink = connect(mapStateToProps)(BuildProfileLink);

function BuildProfileNavLink(props) {
  return <ProfileLink {...props} component={NavLink} />;
}

export const ProfileNavLink = BuildProfileNavLink;