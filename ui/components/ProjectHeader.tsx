import React from 'react';
import { Link } from 'react-router-dom';
import logo from '../images/engioscope.png';
import SearchInput from '../components/common/SearchInput';
import { ProjectDetails } from './ProjectDetails';
import AdvancedFilters from './AdvancedFilters';

const ProjectHeader: React.FC = () => (
  <div className="bg-gray-900 px-32 py-6 mb-12">
    <Link to="/">
      <img src={logo} alt="Logo" className="w-36" />
    </Link>
    <div className="grid grid-cols-3 justify-between w-full items-start mt-12">
      <ProjectDetails />
      <div className="flex justify-end">
        <SearchInput />
        <AdvancedFilters />
      </div>
    </div>
  </div>
);

export default ProjectHeader;
