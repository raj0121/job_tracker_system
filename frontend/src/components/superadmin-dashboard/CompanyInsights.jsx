import Table from "../ui/Table";
import Card from "../ui/Card";
import Button from "../ui/Button";
import SectionHeader from "../ui/SectionHeader";

const CompanyInsights = ({ companies = {}, onNavigate }) => {
  const topRequirements = companies.topRequirements || companies.active || [];
  const candidateVolume = companies.candidateVolume || companies.topHiring || [];

  return (
    <Card>
      <SectionHeader
        title="Company Insights"
        description="See which client companies are driving requirement volume and candidate activity."
        action={(
          <Button variant="secondary" onClick={() => onNavigate?.("/app/companies")}>
            View All
          </Button>
        )}
      />

      <div className="grid gap-6 xl:grid-cols-2">
        <div>
          <h3 className="mb-3 text-sm font-semibold text-slate-900">Top Companies by Requirements</h3>
          <Table>
            <Table.Head>
              <tr>
                <Table.HeadCell>Company</Table.HeadCell>
                <Table.HeadCell align="right">Requirements</Table.HeadCell>
              </tr>
            </Table.Head>
            <Table.Body>
              {topRequirements.map((item) => (
                <Table.Row
                  key={`requirement-${item.label}`}
                  className="cursor-pointer transition-colors hover:bg-slate-50"
                  onClick={() => onNavigate?.("/app/requirements", { company_id: item.companyId || "", search: item.label })}
                >
                  <Table.Cell>{item.label}</Table.Cell>
                  <Table.Cell align="right">{item.requirements || item.openJobs || 0}</Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        </div>

        <div>
          <h3 className="mb-3 text-sm font-semibold text-slate-900">Candidates per Company</h3>
          <Table>
            <Table.Head>
              <tr>
                <Table.HeadCell>Company</Table.HeadCell>
                <Table.HeadCell align="right">Candidates</Table.HeadCell>
              </tr>
            </Table.Head>
            <Table.Body>
              {candidateVolume.map((item) => (
                <Table.Row
                  key={`candidate-${item.label}`}
                  className="cursor-pointer transition-colors hover:bg-slate-50"
                  onClick={() => onNavigate?.("/app/candidates", { company_id: item.companyId || "", search: item.label })}
                >
                  <Table.Cell>{item.label}</Table.Cell>
                  <Table.Cell align="right">{item.candidates || item.hires || 0}</Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        </div>
      </div>
    </Card>
  );
};

export default CompanyInsights;
