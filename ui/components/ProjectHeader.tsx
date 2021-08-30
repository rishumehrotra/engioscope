import React from 'react';
import { Link } from 'react-router-dom';
import logo from '../images/engioscope.png';
import { ProjectDetails } from './ProjectDetails';

const ProjectHeader: React.FC = () => (
  <div className="bg-gray-900 px-32 pt-4 pb-24 mb-8">
    <div className="mb-4 pb-8">
      <Link to="/">
        <img src={logo} alt="Logo" className="w-36" />
      </Link>
    </div>
    <ProjectDetails />
  </div>
);

export default ProjectHeader;
