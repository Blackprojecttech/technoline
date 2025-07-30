import React, { useState, useEffect } from 'react';
import { Form, FormProps, Row, Col } from 'antd';

interface MobileFormProps extends FormProps {
  mobileLayout?: 'vertical' | 'horizontal';
  mobileSpan?: number;
  children?: React.ReactNode;
}

const MobileForm: React.FC<MobileFormProps> = ({
  mobileLayout = 'vertical',
  mobileSpan = 24,
  children,
  ...formProps
}) => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Адаптивные настройки формы
  const getFormLayout = () => {
    if (isMobile) {
      return mobileLayout;
    }
    return formProps.layout || 'horizontal';
  };

  const getFormLabelCol = () => {
    if (isMobile && mobileLayout === 'vertical') {
      return undefined;
    }
    if (isMobile && mobileLayout === 'horizontal') {
      return { span: 24 };
    }
    return formProps.labelCol;
  };

  const getFormWrapperCol = () => {
    if (isMobile && mobileLayout === 'vertical') {
      return undefined;
    }
    if (isMobile && mobileLayout === 'horizontal') {
      return { span: 24 };
    }
    return formProps.wrapperCol;
  };

  return (
    <Form
      {...formProps}
      layout={getFormLayout()}
      labelCol={getFormLabelCol()}
      wrapperCol={getFormWrapperCol()}
      className={`${formProps.className || ''} ${isMobile ? 'mobile-form' : ''}`}
      style={{
        ...formProps.style,
        ...(isMobile && {
          padding: '16px',
        }),
      }}
    >
      {isMobile ? (
        <Row gutter={[16, 16]}>
          <Col span={mobileSpan}>
            {children}
          </Col>
        </Row>
      ) : (
        children
      )}
    </Form>
  );
};

export default MobileForm; 