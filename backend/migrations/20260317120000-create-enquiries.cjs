"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    let tableExists = true;

    try {
      await queryInterface.describeTable("enquiries");
    } catch {
      tableExists = false;
    }

    if (!tableExists) {
      await queryInterface.createTable("enquiries", {
        id: {
          type: Sequelize.INTEGER,
          autoIncrement: true,
          primaryKey: true
        },
        client_name: {
          type: Sequelize.STRING,
          allowNull: false
        },
        contact_number: {
          type: Sequelize.STRING
        },
        email: {
          type: Sequelize.STRING
        },
        client_type: {
          type: Sequelize.STRING
        },
        country: {
          type: Sequelize.STRING
        },
        state: {
          type: Sequelize.STRING
        },
        city: {
          type: Sequelize.STRING
        },
        zip_code: {
          type: Sequelize.STRING
        },
        address: {
          type: Sequelize.TEXT
        },
        company_id: {
          type: Sequelize.INTEGER,
          allowNull: true
        },
        company_name: {
          type: Sequelize.STRING
        },
        industry: {
          type: Sequelize.STRING
        },
        reference_source: {
          type: Sequelize.STRING
        },
        enquiry_date: {
          type: Sequelize.DATE,
          allowNull: true
        },
        enquiry_source: {
          type: Sequelize.STRING
        },
        resource_profile_link: {
          type: Sequelize.STRING
        },
        remarks: {
          type: Sequelize.TEXT
        },
        status: {
          type: Sequelize.ENUM("Active", "Generated"),
          allowNull: false,
          defaultValue: "Active"
        },
        created_by: {
          type: Sequelize.INTEGER,
          allowNull: false
        },
        assigned_to: {
          type: Sequelize.INTEGER,
          allowNull: true
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false
        }
      });
    }

    const indexes = await queryInterface.showIndex("enquiries");
    const hasIndex = (indexName, column) => indexes.some((i) => (
      i.name === indexName
      || (i.fields || []).some((f) => f.name === column || f.attribute === column)
    ));

    const hasCompanyIndex = hasIndex("enquiries_company_id", "company_id");
    const hasCreatedByIndex = hasIndex("enquiries_created_by", "created_by");
    const hasStatusIndex = hasIndex("enquiries_status", "status");
    const hasEnquiryDateIndex = hasIndex("enquiries_enquiry_date", "enquiry_date");

    if (!hasCompanyIndex) {
      await queryInterface.addIndex("enquiries", ["company_id"], {
        name: "enquiries_company_id"
      });
    }
    if (!hasCreatedByIndex) {
      await queryInterface.addIndex("enquiries", ["created_by"], {
        name: "enquiries_created_by"
      });
    }
    if (!hasStatusIndex) {
      await queryInterface.addIndex("enquiries", ["status"], {
        name: "enquiries_status"
      });
    }
    if (!hasEnquiryDateIndex) {
      await queryInterface.addIndex("enquiries", ["enquiry_date"], {
        name: "enquiries_enquiry_date"
      });
    }
  },

  async down(queryInterface) {
    await queryInterface.dropTable("enquiries");
  }
};
